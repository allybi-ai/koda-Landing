(function () {
  'use strict';
  const categories = {
    pt: {sales:'O Allybi na minha equipe',product:'Dúvida sobre o Allybi',security:'Dúvida sobre privacidade e segurança',support:'Ajuda com minha conta',partnership:'Proposta de parceria'},
    en: {sales:'Allybi for my team',product:'A question about Allybi',security:'Privacy and security question',support:'Help with my account',partnership:'Partnership proposal'},
    es: {sales:'Allybi para mi equipo',product:'Una pregunta sobre Allybi',security:'Privacidad y seguridad',support:'Ayuda con mi cuenta',partnership:'Propuesta de colaboración'}
  };
  function subjectForCategory(category, language) {
    const subjects = categories[language?.split('-')[0]] || categories.pt;
    return Object.hasOwn(subjects, category) ? subjects[category] : '';
  }
  if (typeof module === 'object' && module.exports) module.exports = {subjectForCategory};
  if (typeof document === 'undefined') return;

  const form = document.querySelector('.contact-compose');
  if (!form) return;
  const subject = form.elements.subject;
  const message = form.elements.message;
  const status = form.querySelector('.contact-form-status');
  const button = form.querySelector('.contact-send');
  const label = button.querySelector('span');
  const idleLabel = label.textContent;
  const text = key => document.querySelector(`[data-message="${key}"]`).textContent;
  subject.placeholder = text('subject-placeholder');
  message.placeholder = text('message-placeholder');
  const params = new URLSearchParams(location.search || location.hash.split('?')[1]);
  subject.value = subjectForCategory(params.get('category'),document.documentElement.lang);
  let sending = false;
  let requestKey = null;
  let lastPayload = '';

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    const payload = JSON.stringify(Object.fromEntries(new FormData(form)));
    if (payload !== lastPayload || !requestKey) requestKey = crypto.randomUUID();
    lastPayload = payload;
    sending = true;
    button.disabled = true;
    const fields = [...form.querySelectorAll('input,textarea')];
    fields.forEach(field => { field.disabled = true; });
    label.textContent = text('sending');
    form.setAttribute('aria-busy','true');
    status.textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),30000);
    try {
      const response = await fetch(form.action, {
        method:'POST', headers:{'Content-Type':'application/json','Idempotency-Key':requestKey},
        body:payload, signal:controller.signal, credentials:'same-origin'
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true) {
        status.dataset.state = 'error';
        status.textContent = text(response.status === 429 ? 'rate' : 'error');
      } else {
        status.dataset.state = 'success';
        status.textContent = text('success');
        form.reset();
        requestKey = null;
      }
    } catch {
      status.dataset.state = 'error';
      status.textContent = text('error');
    } finally {
      clearTimeout(timeout);
      sending = false;
      button.disabled = false;
      fields.forEach(field => { field.disabled = false; });
      label.textContent = idleLabel;
      form.removeAttribute('aria-busy');
    }
  });
  document.querySelector('[data-copy-email]').addEventListener('click',async()=>{
    const output = document.querySelector('.contact-copy-status');
    try { await navigator.clipboard.writeText('info@allybi.com.br'); output.textContent = text('copied'); }
    catch { output.textContent = text('copy-error'); }
  });
}());
