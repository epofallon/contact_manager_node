class Model {
  constructor() {
    this.url = 'http://localhost:3000/api/contacts';
    this.tags = ['work', 'friend', 'engineering', 'marketing', 'sales'];
  }

  // eslint-disable-next-line consistent-return
  async request(url, options) {
    try {
      let response = await fetch(url, options);
      if (response.ok) return this.responseData(response);

      console.log(`Response Status: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`ERROR: ${error}`);
    }
  }

  responseData(response) {
    let contentType = response.headers.get('Content-Type');
    if (!contentType) {
      return null;
    } else if (contentType.includes('json')) {
      return response.json();
    } else {
      return response.text();
    }
  }

  async getContacts() {
    this.contacts = await this.request(this.url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    this.convertTagsToArrays(this.contacts);
  }

  async getContact(id) {
    let contact = await this.request(this.url + `/${id}`, {
      method: 'GET',
      header: {
        Accept: 'application/json',
      },
    });

    if (contact) this.convertTagsToArrays(contact);
    return contact;
  }

  async postContact(data, contentType) {
    let newContact = await this.request(this.url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': contentType,
      },
      body: data,
    });

    if (!newContact) return;
    this.convertTagsToArrays(newContact);
    this.contacts.push(newContact);
  }

  async updateContact(id, data, contentType) {
    let updatedContact = await this.request(this.url + `/${id}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': contentType,
      },
      body: data,
    });

    if (!updatedContact) return;
    this.convertTagsToArrays(updatedContact);
    let contact = this.findContact(updatedContact.id);

    Object.keys(contact).forEach(key => {
      contact[key] = updatedContact[key];
    });
  }

  deleteContact(id) {
    this.request(this.url + `/${id}`, { method: 'DELETE' });
  }

  convertTagsToArrays(contacts) {
    if (!Array.isArray(contacts)) {
      contacts = [contacts];
    }

    contacts.forEach(contact => {
      if (contact.tags) {
        contact.tags = this.formatTagArray(contact.tags);
      }
    });
  }

  formDataToJson(data) {
    let obj = {};
    for (let entry of data) {
      obj[entry[0]] = entry[1];
    }
    this.removeDuplicateTags(obj);
    return JSON.stringify(obj);
  }

  formatTagArray(tags) {
    let arr = tags.replace(/\s*,\s*$/, '').split(/\s*,\s*/g);
    return arr.map(tag => tag.toLowerCase());
  }

  removeDuplicateTags(data) {
    let tags = this.formatTagArray(data.tags);
    tags = tags.reduce((arr, tag) => {
      return arr.includes(tag) ? arr : arr.concat(tag);
    }, []);
    data.tags = tags.join(',');
  }

  findContact(id) {
    return this.contacts.find(({id: contactId}) => contactId === Number(id));
  }

  findTaggedContacts(tag) {
    return this.contacts.reduce((ids, {id, tags}) => {
      return tags.includes(tag) ? ids.concat(id) : ids;
    }, []);
  }
}

class View {
  constructor() {
    this.compileTemplates();
    this.registerPartials();
    this.formContainer = this.getElement('#contact_form_container');
    this.contactsContainer = this.getElement('#contacts');
    this.search = this.getElement('#search');
    this.clearTag = this.getElement('#clear_tag');
  }

  getElement(selector) {
    return document.querySelector(selector);
  }

  getAllElements(selector) {
    return [...document.querySelectorAll(selector)];
  }

  compileTemplates() {
    this.templates = {};
    let templates = this.getAllElements('[type="text/x-handlebars"]');
    templates.forEach(template => {
      this.templates[template.id] = Handlebars.compile(template.innerHTML);
    });
  }

  registerPartials() {
    let partials = this.getAllElements('[data-type="partial"]');
    partials.forEach(partial => {
      Handlebars.registerPartial(partial.id, partial.innerHTML);
    });
  }

  insertContacts(data) {
    let html = this.templates['contact-list-template'](data);
    this.contactsContainer.innerHTML = '';
    this.contactsContainer.insertAdjacentHTML('beforeend', html);
    this.getContactElements();
  }

  getContactElements() {
    this.contactsList = this.getElement('#contacts_list');
    this.contacts = this.getAllElements('#contacts_list li');
  }

  displayContactForm(data = {}) {
    this.contactsContainer.classList.add('hidden');

    let form = this.templates['form_template'](data);
    this.formContainer.innerHTML = form;
    this.form = this.formContainer.firstElementChild;

    this.formContainer.classList.remove('hidden');
  }

  hideContactForm() {
    this.formContainer.classList.add('hidden');
    this.formContainer.innerHTML = '';
    this.form = null;
    this.contactsContainer.classList.remove('hidden');
  }

  bindNewContactButtons(handler) {
    this.getElement('main').onclick = event => {
      let target = event.target;
      if (!target.classList.contains('add_contact')) return;
      event.preventDefault();
      handler(target);
    };
  }

  bindCancelContactForm(handler) {
    this.getElement('#cancel_contact_form').onclick = event => {
      event.preventDefault();
      handler(event.target);
    };
  }

  bindEditContact(handler) {
    this.contactsContainer.addEventListener('click', event => {
      let target = event.target;
      if (target.classList.contains('edit_contact')) {
        event.preventDefault();
        handler(target.parentElement);
      }
    });
  }

  bindSumbitForm(validSub, invalidSub) {
    this.form.onsubmit = event => {
      event.preventDefault();
      let target = event.target;

      if (target.checkValidity()) {
        validSub(target);
      } else {
        invalidSub(target);
      }
    };
  }

  bindDeleteContact(handler) {
    this.contactsContainer.onclick = event => {
      let target = event.target;
      if (target.classList.contains('delete_contact')) {
        event.preventDefault();
        handler(target.parentElement);
      }
    };
  }

  bindSearch(handler) {
    this.search.onkeydown = event => {
      let key = event.key;
      if (key !== 'Backspace' && key.length !== 1) return;
      event.preventDefault();
      handler(key);
    };
  }

  bindTags(handler) {
    this.contactsContainer.addEventListener('click', event => {
      let target = event.target;
      if (!target.classList.contains('tag')) return;
      event.preventDefault();
      handler(target);
    });
  }

  bindClearTag(handler) {
    this.clearTag.onclick = event => {
      event.preventDefault();
      handler();
    };
  }

  confirmDelete(target) {
    let name = target.querySelector('h3').textContent;
    return confirm(`Are you sure? Deleting ${name} can't be undone.`);
  }

  bindFocusOut(handler) {
    this.form.addEventListener('focusout', event => {
      let target = event.target;
      if (target.tagName !== 'INPUT') return;

      handler(target);
    });
  }

  bindFocusIn(handler) {
    this.form.addEventListener('focusin', event => {
      let target = event.target;
      if (target.tagName !== 'INPUT') return;

      handler(target);
    });
  }

  hideContacts() {
    this.contacts.forEach(contact => {
      let name = contact.firstElementChild.textContent.toLowerCase();
      let searchValue = this.search.value.toLowerCase();
      contact.hidden = !(name.includes(searchValue) || searchValue === '');
    });
  }

  hideNonTagged(foundIds) {
    this.contacts.forEach(contact => {
      let id = Number(contact.dataset.id);
      contact.hidden = !foundIds.includes(id);
    });
  }

  displayAllContacts() {
    this.contacts.forEach(contact => {
      contact.hidden = false;
    });
  }
}

class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.firstRender();
  }

  async firstRender() {
    await this.loadContacts();
    this.view.insertContacts(this.model.contacts);
    this.bindEvents();
  }

  async loadContacts() {
    await this.model.getContacts();
  }

  bindEvents() {
    this.view.bindNewContactButtons(this.handleNewContactButtons);
    this.view.bindDeleteContact(this.handleDeleteContact);
    this.view.bindEditContact(this.handelEditcontact);
    this.view.bindSearch(this.handleSearch);
    this.view.bindTags(this.handleTagSearch);
    this.view.bindClearTag(this.handleClearTag);
  }

  bindFormEvents() {
    this.view.bindCancelContactForm(this.handleCancel);
    this.view.bindSumbitForm(this.handleSubmit, this.handleInvalidSubmit);
    this.view.bindFocusOut(this.handleFocusOut);
    this.view.bindFocusIn(this.handleFocusIn);
  }

  handleNewContactButtons = () => {
    this.view.displayContactForm();
    this.bindFormEvents();
  }

  handleCancel = () => {
    this.view.hideContactForm();
  }

  handleSubmit = async target => {
    let data = new FormData(target);
    let json = this.model.formDataToJson(data);
    let id = data.get('id');

    if (id) {
      await this.model.updateContact(id, json, 'application/json');
    } else {
      await this.model.postContact(json, 'application/json');
    }

    this.view.insertContacts(this.model.contacts);
    this.view.hideContactForm();
  }

  handleInvalidSubmit = () => {
    let message = this.view.getElement('.form_errors');
    message.textContent = 'Fix errors before submitting contact';
  }

  handelEditcontact = target => {
    let contact = this.model.findContact(target.dataset.id);
    this.view.displayContactForm(contact);
    this.bindFormEvents();
  }

  handleDeleteContact = target => {
    let confirm = this.view.confirmDelete(target);
    if (confirm) {
      let contactId = Number(target.dataset.id);
      let id = this.model.contacts.indexOf(this.model.findContact(contactId));
      this.model.contacts.splice(id, 1);
      target.remove();
      this.model.deleteContact(contactId);
    }
  }

  handleSearch = key => {
    if (key.length === 1) {
      this.view.search.value += key;
    } else if (key === 'Backspace') {
      let text = this.view.search.value;
      this.view.search.value = text.slice(0, text.length - 1);
    }

    this.view.hideContacts();
  }

  handleTagSearch = target => {
    let tag = target.textContent.toLowerCase();
    let foundIds = this.model.findTaggedContacts(tag);
    this.view.hideNonTagged(foundIds);
    this.view.clearTag.classList.remove('hidden');
  }

  handleClearTag = () => {
    this.view.displayAllContacts();
    this.view.clearTag.classList.add('hidden');
  }

  handleFocusOut = target => {
    if (target.validity.valueMissing) {
      this.missingValue(target);
    } else if (target.validity.patternMismatch) {
      this.mismatchedPattern(target);
    }
  }

  handleFocusIn = target => {
    if (!target.classList.contains('invalid_field')) return;
    this.getSpan(target).textContent = '';
    target.classList.remove('invalid_field');
  }

  missingValue(target) {
    let text = `${this.getLabel(target).textContent} is a required field.`;
    this.invalidField(target, text);
  }

  mismatchedPattern(target) {
    let text = `Please enter a valid ${this.getLabel(target).textContent}`;
    this.invalidField(target, text);
  }

  invalidField(target, text) {
    this.getSpan(target).textContent = text;
    target.classList.add('invalid_field');
  }

  getLabel(target) {
    return this.view.getElement(`[for="${target.name}"]`);
  }

  getSpan(target) {
    return target.previousElementSibling;
  }
}

// eslint-disable-next-line no-unused-vars
let app = new Controller(new Model(), new View());