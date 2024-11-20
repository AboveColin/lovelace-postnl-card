import { LitElement, html, css } from 'lit-element';
import moment from 'moment';
import 'moment/locale/nl';

class PostNLCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      deliveryConfigs: { type: Array },
      distributionConfigs: { type: Array },
      lettersConfigs: { type: Array },
      delivery: { type: Array },
      distribution: { type: Array },
      letters: { type: Array },
      name: { type: String },
      icon: { type: String },
      dateFormat: { type: String },
      timeFormat: { type: String },
      pastDays: { type: Number },
      language: { type: String },
      hideDelivered: { type: Boolean },
      enrouteShipments: { type: Array },
      deliveredShipments: { type: Array },
      letterItems: { type: Array },
      _currentTab: { type: String },
    };
  }

  constructor() {
    super();
    this.deliveryConfigs = [];
    this.distributionConfigs = [];
    this.lettersConfigs = [];
    this.delivery = [];
    this.distribution = [];
    this.letters = [];
    this.name = 'PostNL';
    this.icon = 'mdi:mailbox';
    this.dateFormat = 'DD MMM YYYY';
    this.timeFormat = 'HH:mm';
    this.pastDays = 1;
    this.language = 'nl';
    this.hideDelivered = false;
    this.enrouteShipments = [];
    this.deliveredShipments = [];
    this.letterItems = [];
    this._currentTab = 'shipments';

    this.TRANSLATIONS = {
      en: {
        letters: 'Letters',
        letter: 'Letter',
        enroute: 'Enroute',
        delivered: 'Delivered',
        shipments: 'Shipments',
        title: 'Title',
        status: 'Status',
        deliveryDate: 'Delivery Date',
        today: 'Today',
        tomorrow: 'Tomorrow',
        unknown: 'Unknown',
        unavailable_entities: 'The given entities are not available. Please check your card configuration',
        no_enroute: 'No enroute shipments',
        no_delivered: 'No delivered shipments',
        no_letters: 'No letters',
      },
      nl: {
        letters: 'Brieven',
        letter: 'Brief',
        enroute: 'Onderweg',
        delivered: 'Bezorgd',
        shipments: 'Zendingen',
        title: 'Titel',
        status: 'Status',
        deliveryDate: 'Bezorgdatum',
        today: 'Vandaag',
        tomorrow: 'Morgen',
        unknown: 'Onbekend',
        unavailable_entities: 'De opgegeven entiteiten zijn niet beschikbaar. Controleer je card configuratie',
        no_enroute: 'Geen zendingen onderweg',
        no_delivered: 'Geen bezorgde zendingen',
        no_letters: 'Geen brieven',
      },
    };
  }

  setConfig(config) {
    if (
      (!config.delivery || config.delivery.length === 0) &&
      (!config.distribution || config.distribution.length === 0) &&
      (!config.letters || config.letters.length === 0)
    ) {
      throw new Error('Please define at least one entity (delivery, distribution, or letters)');
    }
    this.config = config;
    this.name = config.name || 'PostNL';
    this.icon = config.icon || 'mdi:mailbox';
    this.dateFormat = config.date_format || 'DD MMM YYYY';
    this.timeFormat = config.time_format || 'HH:mm';
    this.pastDays = config.past_days || 1;
    this.language = config.language || 'en';
    this.hideDelivered = config.hide_delivered || false;
    moment.locale(this.language);
    this.t = this.TRANSLATIONS[this.language];

    this.deliveryConfigs = Array.isArray(config.delivery) ? config.delivery : config.delivery ? [config.delivery] : [];
    this.distributionConfigs = Array.isArray(config.distribution) ? config.distribution : config.distribution ? [config.distribution] : [];
    this.lettersConfigs = Array.isArray(config.letters) ? config.letters : config.letters ? [config.letters] : [];

    this.delivery = [];
    this.distribution = [];
    this.letters = [];
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config.language) {
      this.language = this._hass.language === 'nl' ? 'nl' : 'en';
      moment.locale(this.language);
      this.t = this.TRANSLATIONS[this.language];
    }
    this._updateEntities();
    this._updateData();
  }

  _updateEntities() {
    if (!this._hass) return;

    this.delivery = this.deliveryConfigs.map(config => {
      const state = this._hass.states[config.entity];
      if (!state) {
        console.warn(`PostNLCard: Delivery entity "${config.entity}" not found.`);
        return null;
      }
      return {
        state,
        name: config.name || state.attributes.name || null,
      };
    }).filter(Boolean);

    this.distribution = this.distributionConfigs.map(config => {
      const state = this._hass.states[config.entity];
      if (!state) {
        console.warn(`PostNLCard: Distribution entity "${config.entity}" not found.`);
        return null;
      }
      return {
        state,
        name: config.name || state.attributes.name || null,
      };
    }).filter(Boolean);

    this.letters = this.lettersConfigs.map(config => {
      const state = this._hass.states[config.entity];
      if (!state) {
        console.warn(`PostNLCard: Letters entity "${config.entity}" not found.`);
        return null;
      }
      return {
        state,
        name: config.name || state.attributes.name || null,
      };
    }).filter(Boolean);
  }

  _updateData() {
    const now = moment();
    const pastDate = now.clone().subtract(this.pastDays, 'days').startOf('day');

    this.enrouteShipments = [];
    this.deliveredShipments = [];
    this.letterItems = [];

    let enroute = [];
    let delivered = [];

    this.delivery.forEach(deliveryEntry => {
      const deliveryEntity = deliveryEntry.state;
      const deliveryName = deliveryEntry.name;
      const deliveryEnroute = (deliveryEntity.attributes.enroute || []).map(shipment => ({
        ...shipment,
        sender_name: deliveryName,
      }));
      const deliveryDelivered = (deliveryEntity.attributes.delivered || []).map(shipment => ({
        ...shipment,
        sender_name: deliveryName,
      }));
      enroute = enroute.concat(deliveryEnroute);
      delivered = delivered.concat(deliveryDelivered);
    });

    this.distribution.forEach(distributionEntry => {
      const distributionEntity = distributionEntry.state;
      const distributionName = distributionEntry.name;
      const distributionEnroute = (distributionEntity.attributes.enroute || []).map(shipment => ({
        ...shipment,
        sender_name: distributionName,
      }));
      const distributionDelivered = (distributionEntity.attributes.delivered || []).map(shipment => ({
        ...shipment,
        sender_name: distributionName,
      }));
      enroute = enroute.concat(distributionEnroute);
      delivered = delivered.concat(distributionDelivered);
    });

    this.enrouteShipments = enroute
      .sort((a, b) => moment(b.planned_date).diff(moment(a.planned_date)));

    this.deliveredShipments = delivered
      .filter(shipment => shipment.delivery_date && moment(shipment.delivery_date).isSameOrAfter(pastDate))
      .sort((a, b) => moment(b.delivery_date).diff(moment(a.delivery_date)));

    this.letters.forEach(letterEntry => {
      const letterEntity = letterEntry.state;
      if (letterEntity.attributes.letters) {
        const letters = Object.values(letterEntity.attributes.letters)
          .filter(letter => moment(letter.delivery_date).isSameOrAfter(pastDate))
          .map(letter => ({
            ...letter,
            sender_name: letterEntry.name,
          }));
        this.letterItems = this.letterItems.concat(letters);
      }
    });

    this.letterItems.sort((a, b) => moment(b.delivery_date).diff(moment(a.delivery_date)));
  }

  render() {
    if (
      this.delivery.length === 0 &&
      this.distribution.length === 0 &&
      this.letters.length === 0
    ) {
      return html`
        <ha-card>
          <div class="not-found">${this.t.unavailable_entities}</div>
        </ha-card>
      `;
    }
    return html`
      <ha-card>
        ${this._renderHeader()}
        <div class="card-content">
          ${this._renderInfoGrid()}
          ${this._renderTabs()}
        </div>
      </ha-card>
    `;
  }

  _renderHeader() {
    return html`
      <div class="card-header">
        <ha-icon icon=${this.icon}></ha-icon>
        <div class="name">${this.name}</div>
      </div>
    `;
  }

  _renderInfoGrid() {
    return html`
      <div class="info-grid">
        ${this.letters.length > 0 ? html`
          <div class="info-item">
            <ha-icon icon="mdi:email"></ha-icon>
            <div>${this.letterItems.length} ${this.letterItems.length === 1 ? this.t.letter : this.t.letters}</div>
          </div>
        ` : ''}
        <div class="info-item">
          <ha-icon icon="mdi:truck-delivery"></ha-icon>
          <div>${this.enrouteShipments.length} ${this.t.enroute}</div>
        </div>
        <div class="info-item">
          <ha-icon icon="mdi:package-variant"></ha-icon>
          <div>${this.deliveredShipments.length} ${this.t.delivered}</div>
        </div>
      </div>
    `;
  }

  _renderTabs() {
    return html`
      <div class="tabs">
        <div class="tab-buttons">
          <button class="tab-button ${this._currentTab === 'shipments' ? 'active' : ''}" @click=${() => this._selectTab('shipments')}>${this.t.shipments}</button>
          ${this.letters.length > 0 ? html`
            <button class="tab-button ${this._currentTab === 'letters' ? 'active' : ''}" @click=${() => this._selectTab('letters')}>${this.t.letters}</button>
          ` : ''}
        </div>
        <div class="tab-content">
          ${this._currentTab === 'shipments' ? this._renderShipmentsTab() : ''}
          ${this._currentTab === 'letters' ? this._renderLettersTab() : ''}
        </div>
      </div>
    `;
  }

  _selectTab(tab) {
    this._currentTab = tab;
    this.requestUpdate();
  }

  _renderShipmentsTab() {
    return html`
      <div class="shipments-section">
        <h3>${this.t.enroute}</h3>
        ${this.enrouteShipments.length > 0
          ? html`
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>${this.t.title}</th>
                      <th>${this.t.status}</th>
                      <th>${this.t.deliveryDate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.enrouteShipments.map((shipment) => this._renderShipmentRow(shipment, 'enroute'))}
                  </tbody>
                </table>
              </div>
            `
          : html`<p class="no-items">${this.t.no_enroute}</p>`}
      </div>
      ${!this.hideDelivered
        ? html`
            <div class="shipments-section">
              <h3>${this.t.delivered}</h3>
              ${this.deliveredShipments.length > 0
                ? html`
                    <div class="table-container">
                      <table class="data-table">
                        <thead>
                          <tr>
                            <th></th>
                            <th>${this.t.title}</th>
                            <th>${this.t.status}</th>
                            <th>${this.t.deliveryDate}</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${this.deliveredShipments.map((shipment) => this._renderShipmentRow(shipment, 'delivered'))}
                        </tbody>
                      </table>
                    </div>
                  `
                : html`<p class="no-items">${this.t.no_delivered}</p>`}
            </div>
          `
        : ''}
    `;
  }

  _renderShipmentRow(shipment, status) {
    let deliveryDate = this.t.unknown;
    let icon = status === 'delivered' ? 'mdi:check-circle' : 'mdi:truck';
    let className = status;

    if (shipment.delivery_date) {
      deliveryDate = this._formatDate(shipment.delivery_date);
    } else if (shipment.planned_date) {
      if (shipment.expected_datetime) {
        deliveryDate = `${this._formatDate(shipment.expected_datetime)} ${this._formatTime(shipment.expected_datetime)}`;
      } else {
        deliveryDate = `${this._formatDate(shipment.planned_date)} ${this._formatTime(shipment.planned_from)} - ${this._formatTime(shipment.planned_to)}`;
      }
    }

    const title = shipment.sender_name ? `${shipment.name} (${shipment.sender_name})` : `${shipment.name}`;

    return html`
      <tr class="${className}">
        <td><ha-icon icon="${icon}"></ha-icon></td>
        <td><a href="${shipment.url}" target="_blank">${title}</a></td>
        <td>${shipment.status_message || this.t.unknown}</td>
        <td>${deliveryDate}</td>
      </tr>
    `;
  }

  _renderLettersTab() {
    return html`
      <div class="letters-section">
        <h3>${this.t.letters}</h3>
        ${this.letterItems.length > 0
          ? html`
              ${this.letterItems[0].image
                ? html`
                    <div class="letter-image">
                      <img src="${this.letterItems[0].image}&width=400&height=300" alt="Letter Image" />
                    </div>
                  `
                : ''}
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>${this.t.title}</th>
                      <th>${this.t.status}</th>
                      <th>${this.t.deliveryDate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.letterItems.map((letter) => this._renderLetterRow(letter))}
                  </tbody>
                </table>
              </div>
            `
          : html`<p class="no-items">${this.t.no_letters}</p>`}
      </div>
    `;
  }

  _renderLetterRow(letter) {
    let icon = 'mdi:email';

    const title = letter.sender_name ? `${letter.sender_name}: ${letter.id}` : `${letter.id}`;

    return html`
      <tr>
        <td><ha-icon icon="${icon}"></ha-icon></td>
        <td>
          ${letter.image
            ? html`<a href="${letter.image}" target="_blank">${title}</a>`
            : `${title}`}
        </td>
        <td>${letter.status_message || this.t.unknown}</td>
        <td>${this._formatDate(letter.delivery_date)}</td>
      </tr>
    `;
  }

  _formatDate(date) {
    const momentDate = moment(date);
    return momentDate.calendar(null, {
      sameDay: this.t.today,
      nextDay: this.t.tomorrow,
      sameElse: this.dateFormat,
    });
  }

  _formatTime(date) {
    return moment(date).format(this.timeFormat);
  }

  static get styles() {
    return css`
      :host {
        --card-primary-color: var(--primary-color, #03a9f4);
        --card-secondary-color: var(--secondary-color, #018786);
        --card-background-color: var(--card-background-color, #fff);
        --card-text-color: var(--primary-text-color, #212121);
      }
      ha-card {
        background-color: var(--card-background-color);
        color: var(--card-text-color);
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      .card-header {
        display: flex;
        align-items: center;
        font-size: 1.5rem;
        font-weight: 500;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      .card-header ha-icon {
        margin-right: 8px;
        color: var(--card-primary-color);
      }
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 16px;
        margin: 16px 0;
      }
      .info-item {
        text-align: center;
        background-color: var(--card-background-color);
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .info-item ha-icon {
        display: block;
        margin: 0 auto 8px;
        color: var(--card-secondary-color);
        font-size: 24px;
      }
      .tabs {
        margin-top: 16px;
      }
      .tab-buttons {
        display: flex;
        margin-bottom: 16px;
      }
      .tab-button {
        flex: 1;
        padding: 8px 16px;
        background: transparent;
        color: var(--card-text-color);
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.3s ease;
      }
      .tab-button.active {
        border-bottom-color: var(--card-primary-color);
        color: var(--card-primary-color);
      }
      .tab-content {
        background-color: var(--card-background-color);
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .table-container {
        overflow-x: auto;
      }
      .data-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0 8px;
      }
      .data-table th, .data-table td {
        padding: 12px;
        text-align: left;
      }
      .data-table th {
        font-weight: 500;
        color: var(--secondary-text-color, #757575);
      }
      .data-table tr {
        background-color: var(--card-background-color);
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border-radius: 8px;
      }
      .data-table tr td:first-child {
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
      }
      .data-table tr td:last-child {
        border-top-right-radius: 8px;
        border-bottom-right-radius: 8px;
      }
      .letter-image {
        text-align: center;
        margin-bottom: 16px;
      }
      .letter-image img {
        max-width: 100%;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      .not-found, .no-items {
        color: var(--secondary-text-color, #757575);
        text-align: center;
        padding: 16px;
        font-style: italic;
      }
      a {
        color: var(--card-primary-color);
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    `;
  }
}

customElements.define('postnl-card', PostNLCard);
