import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/comms/ghl";
import { generateSmsReply } from "@/lib/comms/sms-agent";

/**
 * Inbound SMS from GoHighLevel's Conversations webhook. Point the
 * sub-account's inbound webhook at https://connectable.work/api/webhooks/ghl
 * and include the shared secret (see HIGHLEVEL_INBOUND_WEBHOOK_SECRET below)
 * either as an `x-webhook-secret` header or a `?secret=` query param.
 *
 * NOTE: field names below follow GHL's documented Conversations webhook
 * shape, but should be checked against a real test message once the webhook
 * is actually configured in the dashboard -- adjust the destructuring to
 * match what the real payload sends before relying on it for a demo.
 *
 * Rules that matter on stage:
 *  - Return 200 promptly for valid authenticated messages. GHL retries any non-2xx, and generating a
 *    reply inline would mean a judge sees the same text three times.
 *    `after()` runs the reply generation once the response has already
 *    gone out -- the correct pattern on a serverless platform, where a
 *    fire-and-forget setTimeout is not guaranteed to survive past the
 *    response (the function can freeze or be torn down right after return).
 *  - De-duplicate on the provider's own message id (a retry must not
 *    enqueue a second reply) -- enforced by the unique constraint on
 *    sms_messages.provider_message_id in the migration. Missing provider
 *    IDs are rejected because those messages cannot be de-duplicated.
 *  - Authenticate the caller. This endpoint sends real SMS and spends real
 *    API budget on whatever `phone`/`message` it is handed, so an unsigned
 *    request must not be able to drive it.
 */
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.HIGHLEVEL_INBOUND_WEBHOOK_SECRET || process.env.GHL_WEBHOOK_SECRET;
  if (expectedSecret) {
    const provided =
      req.headers.get("x-webhook-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
    if (provided !== expectedSecret) {
      console.warn("ghl webhook: rejected a request with a missing/incorrect secret");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const messageId: string | undefined = body.messageId ?? body.id;
  const phone: string | undefined = body.phone ?? body.contactPhone;
  const text: string | undefined = body.message ?? body.body;
  if (!phone || !text || !messageId) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: conversation, error: convError } = await supabase
    .from("sms_conversations")
    .upsert({ phone }, { onConflict: "phone", ignoreDuplicates: false })
    .select("id")
    .single();
  if (convError || !conversation) {
    console.error("sms_conversations upsert failed", convError);
    return NextResponse.json({ ok: true }); // ack anyway -- GHL should not retry on our DB issue
  }

  const { error: insertError } = await supabase
    .from("sms_messages")
    .insert({ conversation_id: conversation.id, direction: "inbound", body: text, provider_message_id: messageId });
  if (insertError) {
    if (insertError.code === "23505") {
      // Unique violation on provider_message_id: this is a GHL retry of a
      // message we already processed -- ack and do nothing further.
      return NextResponse.json({ ok: true });
    }
    // Any other write failure (e.g. the body length check) is a real error,
    // not a retry. Ack so GHL stops hammering us, but make it visible.
    console.error("sms_messages insert failed", insertError);
    return NextResponse.json({ ok: true });
  }

  after(async () => {
    try {
      const { data: history } = await supabase
        .from("sms_messages")
        .select("provider_message_id, direction, body")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(20);

      const rows = history ?? [];
      // Drop the inbound message we just inserted -- it's passed to the agent
      // separately. Match it by id when we have one; otherwise fall back to
      // dropping the last row (which, ordered ascending, is the one we added).
      const priorRows = messageId
        ? rows.filter((m) => m.provider_message_id !== messageId)
        : rows.slice(0, -1);
      const historyForAgent = priorRows.map((m) => ({
        role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
        text: m.body,
      }));

      const reply = await generateSmsReply(text, historyForAgent);

      if (reply.needsHuman) {
        // Deterministic distress markers fired. Flag the conversation for a
        // human and alert -- the reply the model was told to produce is a
        // warm hand-off line, so it's still safe to send, but a person must
        // pick this up.
        console.error("[SMS ESCALATION] distress markers in inbound message", {
          conversationId: conversation.id,
        });
        // Don't let a flag-write problem (e.g. the needs_human migration not
        // applied yet) stop the warm hand-off reply from going out.
        const { error: flagError } = await supabase
          .from("sms_conversations")
          .update({ needs_human: true, needs_human_at: new Date().toISOString() })
          .eq("id", conversation.id);
        if (flagError) console.error("could not flag sms_conversation for a human", flagError);
      }

      if (!reply.text) return;

      const sendResult = await sendSms(phone, reply.text);
      if (!sendResult.ok) {
        console.error("SMS send failed", sendResult.error);
        return;
      }
      await supabase.from("sms_messages").insert({
        conversation_id: conversation.id,
        direction: "outbound",
        body: reply.text,
        provider_message_id: sendResult.providerMessageId,
      });
    } catch (err) {
      // A dropped reply should surface as a monitoring alert, not a 500 on
      // a webhook whose response has already been sent.
      console.error("SMS reply generation failed", err);
    }
  });

  return NextResponse.json({ ok: true });
}
