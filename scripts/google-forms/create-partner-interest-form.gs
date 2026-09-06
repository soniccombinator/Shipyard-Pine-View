/**
 * Paste into a new project at https://script.google.com/ and run
 * createPartnerInterestForm. The form is created as a draft in your account.
 * Open the editor link in the execution log to publish and copy its responder link.
 */
function createPartnerInterestForm() {
  const properties = PropertiesService.getUserProperties();
  const savedId = properties.getProperty('CONNECTABLE_PARTNER_INTEREST_FORM_ID');

  // Reuse a successfully created form without changing its questions or responses.
  if (savedId) {
    const existingForm = FormApp.openById(savedId);
    console.log('Edit your existing form: ' + existingForm.getEditUrl());
    return;
  }

  const form = FormApp.create('Partner with ConnectAble', false);
  console.log('Edit your new form: ' + form.getEditUrl());

  form
    .setDescription(
      'Interested in investing in or partnering with ConnectAble? ' +
      'Tell us a little about yourself and how you would like to get involved. ' +
      'Submit your details so our team can contact you about your interest.'
    )
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setPublishingSummary(false)
    .setShowLinkToRespondAgain(false)
    .setConfirmationMessage(
      'Thank you for your interest in partnering with ConnectAble. ' +
      'Your message has been received. We look forward to connecting with you.'
    );

  form.addTextItem().setTitle('Name').setRequired(true);

  form.addTextItem()
    .setTitle('Phone')
    .setHelpText('Optional. Include your country code if outside the United States.');

  form.addTextItem()
    .setTitle('Email')
    .setRequired(true)
    .setValidation(
      FormApp.createTextValidation()
        .requireTextIsEmail()
        .setHelpText('Please enter a valid email address.')
        .build()
    );

  form.addParagraphTextItem()
    .setTitle('Message')
    .setHelpText('Tell us how you would like to partner with us.');

  form.addTextItem()
    .setTitle('Business')
    .setHelpText('Your business or organization name, if applicable.');

  form.addTextItem()
    .setTitle('Business website')
    .setHelpText('If applicable. For example, https://yourbusiness.com')
    .setValidation(
      FormApp.createTextValidation()
        .requireTextIsUrl()
        .setHelpText('Please enter a full website address, such as https://yourbusiness.com.')
        .build()
    );

  properties.setProperty('CONNECTABLE_PARTNER_INTEREST_FORM_ID', form.getId());
  console.log('Draft ready. Open the editor link above, publish, and copy the responder link.');
}
