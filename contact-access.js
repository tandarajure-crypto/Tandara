(function () {
  var form = document.querySelector('.archive-contact-form');
  if (!form) return;

  var normalContactAction = form.action;
  var inquiryType = form.querySelector('#vrsta-upita');
  var privateValues = [
    'Zahtjev za pristup privatnom arhivu',
    'Request for access to the private archive'
  ];

  form.addEventListener('submit', function (event) {
    if (event.defaultPrevented || !form.checkValidity()) return;
    var requestsPrivateAccess = inquiryType && privateValues.indexOf(inquiryType.value) !== -1;
    form.action = requestsPrivateAccess
      ? 'https://privat-tvz.pages.dev/__public-access-request'
      : normalContactAction;
  });
})();
