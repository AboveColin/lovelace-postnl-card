import { LitElement, html, css } from 'lit-element';
import moment from 'moment';
import 'moment/locale/nl';

class PostNLCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      delivery: { type: Object },
      distribution: { type: Object },
      letters: { type: Object },
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
    this.delivery = null;
    this.distribution = null;
    this.letters = null;
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
    if (!config.delivery && !config.distribution && !config.letters) {
      throw new Error('Please define at least one entity (delivery, distribution, or letters)');
    }
    this.config = config;
    this.name = config.name || 'PostNL';
    this.icon = config.icon || 'mdi:mailbox';
    this.dateFormat = config.date_format || 'DD MMM YYYY';
    this.timeFormat = config.time_format || 'HH:mm';
    this.pastDays = config.past_days || 1;
    this.language = config.language || (this.hass.language === 'nl' ? 'nl' : 'en');
    this.hideDelivered = config.hide_delivered || false;
    moment.locale(this.language);
    this.t = this.TRANSLATIONS[this.language];
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config.delivery) {
      this.delivery = hass.states[this.config.delivery];
    }
    if (this.config.distribution) {
      this.distribution = hass.states[this.config.distribution];
    }
    if (this.config.letters) {
      this.letters = hass.states[this.config.letters];
    }
    this._updateData();
  }

  _updateData() {
    const now = moment();
    const pastDate = now.clone().subtract(this.pastDays, 'days').startOf('day');

    this.enrouteShipments = [];
    this.deliveredShipments = [];
    this.letterItems = [];

    const enroute = [];
    const delivered = [];

    if (this.delivery) {
      const deliveryEnroute = this.delivery.attributes.enroute || [];
      const deliveryDelivered = this.delivery.attributes.delivered || [];
      enroute.push(...deliveryEnroute);
      delivered.push(...deliveryDelivered);
    }
    if (this.distribution) {
      const distributionEnroute = this.distribution.attributes.enroute || [];
      const distributionDelivered = this.distribution.attributes.delivered || [];
      enroute.push(...distributionEnroute);
      delivered.push(...distributionDelivered);
    }

    this.enrouteShipments = enroute.sort((a, b) => moment(b.planned_date).diff(moment(a.planned_date)));

    this.deliveredShipments = delivered.filter(shipment => shipment.delivery_date && moment(shipment.delivery_date).isSameOrAfter(pastDate))
      .sort((a, b) => moment(b.delivery_date).diff(moment(a.delivery_date)));

    if (this.letters && this.letters.attributes.letters) {
      const letters = Object.values(this.letters.attributes.letters)
        .filter(letter => moment(letter.delivery_date).isSameOrAfter(pastDate))
        .sort((a, b) => moment(b.delivery_date).diff(moment(a.delivery_date)));
      this.letterItems = letters;
    }
  }

  render() {
    if (!this.delivery && !this.distribution && !this.letters) {
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
        ${this.letters ? html`
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
          ${this.letters ? html`
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
            `
          : html`<p>${this.t.no_enroute}</p>`}
      </div>
      ${!this.hideDelivered
        ? html`
            <div class="shipments-section">
              <h3>${this.t.delivered}</h3>
              ${this.deliveredShipments.length > 0
                ? html`
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
                  `
                : html`<p>${this.t.no_delivered}</p>`}
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

    return html`
      <tr class="${className}">
        <td><ha-icon icon="${icon}"></ha-icon></td>
        <td><a href="${shipment.url}" target="_blank">${shipment.name}</a></td>
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
            `
          : html`<p>${this.t.no_letters}</p>`}
      </div>
    `;
  }

  _renderLetterRow(letter) {
    let icon = 'mdi:email';

    return html`
      <tr>
        <td><ha-icon icon="${icon}"></ha-icon></td>
        <td>
          ${letter.image
            ? html`<a href="${letter.image}" target="_blank">${letter.id}</a>`
            : letter.id}
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
      ha-card {
        padding: 16px;
      }
      .card-header {
        display: flex;
        align-items: center;
        font-size: 24px;
        padding-bottom: 16px;
      }
      .card-header ha-icon {
        margin-right: 8px;
      }
      .info-grid {
        display: flex;
        justify-content: space-around;
        margin-bottom: 16px;
      }
      .info-item {
        text-align: center;
      }
      .info-item ha-icon {
        display: block;
        margin: 0 auto 8px;
        color: var(--paper-item-icon-color, #44739e);
      }
      .tabs {
        margin-top: 16px;
      }
      .tab-buttons {
        display: flex;
      }
      .tab-button {
        flex: 1;
        padding: 8px;
        background: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
        cursor: pointer;
      }
      .tab-button.active {
        background: var(--primary-dark-color);
      }
      .tab-content {
        margin-top: 16px;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
      }
      .data-table th, .data-table td {
        padding: 8px;
        border-bottom: 1px solid var(--divider-color);
        text-align: left;
      }
      .letter-image {
        text-align: center;
        margin-bottom: 16px;
      }
      .letter-image img {
        max-width: 100%;
      }
      .not-found {
        color: var(--error-color);
        text-align: center;
        padding: 16px;
      }
    `;
  }
}

customElements.define('postnl-card', PostNLCard);
