# Partner with ConnectAble

Responder link: https://forms.gle/qHUJ6irF4o8W2swR9

The landing page uses `PARTNER_FORM_URL` in `src/lib/site.ts`. QR files are in
`public/partner/interest-qr.svg` and `public/partner/interest-qr.png`.
After changing the URL, regenerate both files with `npx tsx scripts/make-partner-qr.tsx`.

## Add the logo to the Google Form

The header image is [form-header.png](../public/partner/form-header.png), sized at
1600 × 400 pixels. It follows the site's Poppins wordmark, colors, and proportions;
the [SVG source](../public/partner/form-header.svg) uses outlined lettering so it
does not depend on installed fonts.

Open the form editor, click **Customize theme** (the palette), then under
**Header** select **Choose image → Upload** and choose `form-header.png`.
Keep the full image in the crop and confirm. Check the form preview afterward.
The header asset is ready locally; uploading it to the Google Form is still required.

## Description

Interested in investing in or partnering with ConnectAble? Tell us a little about yourself and how you would like to get involved. Submit your details so our team can contact you about your interest.

## Fields

| Field | Google Forms type | Required | Help text |
| --- | --- | --- | --- |
| Name | Short answer | Yes | |
| Phone | Short answer | No | Optional. Include your country code if outside the United States. |
| Email | Short answer, email validation | Yes | |
| Message | Paragraph | No | Tell us how you would like to partner with us. |
| Business | Short answer | No | Your business or organization name, if applicable. |
| Business website | Short answer, URL validation | No | If applicable. For example, https://yourbusiness.com |

## Confirmation message

Thank you for your interest in partnering with ConnectAble. Your message has been received. We look forward to connecting with you.

## Create the Google Form

1. Open [Google Apps Script](https://script.google.com/) in the Google account that should own the form and select **New project**.
2. Replace the contents of `Code.gs` with [create-partner-interest-form.gs](../scripts/google-forms/create-partner-interest-form.gs) and save.
3. Select `createPartnerInterestForm`, click **Run**, and complete Google's authorization prompt for creating the form.
4. Open the editor link in the **Execution log**. The draft contains the six fields above. Successful repeat runs in the same account and script project reopen that form without changing it.
5. In Google Forms, click **Publish**, set responder access to **Anyone with the link** for a public interest form, and publish. Workspace account policies may limit the available access options.
6. Copy the **responder link** for the landing page and QR code. Check that link in a signed-out window before sharing it.

You can also copy the description, fields, and confirmation message above into a blank Google Form manually.

The script uses a single email question, leaves the one-response limit off, and keeps response summaries private. Responses are available in the form's **Responses** tab. It does not send emails.

## References

- [Google Apps Script projects](https://developers.google.com/apps-script/guides/projects)
- [Creating forms with FormApp](https://developers.google.com/apps-script/reference/forms/form-app)
- [Email and URL validation](https://developers.google.com/apps-script/reference/forms/text-validation-builder)
- [Publishing and sharing Google Forms](https://support.google.com/docs/answer/2839588)
- [Changing the form's theme and header](https://support.google.com/docs/answer/145737?hl=en)
