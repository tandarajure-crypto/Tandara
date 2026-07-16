window.dataLayer = window.dataLayer || [];

function gtag() {
  dataLayer.push(arguments);
}

gtag('consent', 'default', {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});

gtag('js', new Date());

gtag('config', 'G-S33NBEJQFD', {
  send_page_view: true,
  page_title: document.title,
  page_location: window.location.href,
  page_path: window.location.pathname,
  language: document.documentElement.lang || navigator.language || 'hr'
});

document.addEventListener('click', function (event) {
  const link = event.target.closest('a');

  if (!link || !link.href || typeof gtag !== 'function') {
    return;
  }

  const href = link.href;
  const text = (link.innerText || link.textContent || '')
    .trim()
    .substring(0, 120);

  const isMail = href.indexOf('mailto:') === 0;
  const isTel = href.indexOf('tel:') === 0;
  const isExternal =
    link.hostname && link.hostname !== window.location.hostname;

  const isDownload =
    /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|png|jpe?g|gif|webp)$/i.test(
      link.pathname || ''
    );

  if (isMail || isTel) {
    gtag('event', 'contact_click', {
      contact_type: isMail ? 'email' : 'phone',
      link_text: text,
      link_url: href
    });
  }

  if (isExternal) {
    gtag('event', 'external_link_click', {
      link_text: text,
      link_url: href
    });
  }

  if (isDownload) {
    gtag('event', 'file_download', {
      file_name: (link.pathname || '').split('/').pop(),
      link_text: text,
      link_url: href
    });
  }
});
