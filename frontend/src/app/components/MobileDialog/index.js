// @flow
import React, { Component } from "react";
import classnames from "classnames";
// $FlowFixMe
import { isValidNumber } from "libphonenumber-js";
// $FlowFixMe
import { validate } from "email-validator";
import { Localized } from "fluent-react/compat";
import Loading from "../Loading";

import { acceptedSMSCountries } from "../../actions/browser";

import "./index.scss";

import iconIos from "../../../images/ios-light.svg";
import iconGoogle from "../../../images/google-play.png";

import { subscribeToBasket, subscribeToBasketSMS } from "../../lib/utils";

type MobileDialogProps = {
  getWindowLocation: Function,
  onCancel: Function,
  sendToGA: Function,
  experiment: Object,
  fetchCountryCode: Function,
  countryCode: null | string,
  fromFeatured?: boolean
}

type MobileDialogState = {
  isSuccess: boolean,
  isError: boolean,
  submitAttempted: boolean,
  recipient: string
}

const DEFAULT_STATE = {
  isSuccess: false,
  isError: false,
  submitAttempted: false,
  recipient: ""
};

export default class MobileDialog extends Component<MobileDialogProps, MobileDialogState> {
  modalContainer: ?HTMLElement

  constructor(props: MobileDialogProps) {
    super(props);
    this.state = DEFAULT_STATE;
  }

  componentDidMount() {
    this.focusModalContainer();
    this.props.fetchCountryCode();
  }

  render() {
    const { countryCode, experiment, sendToGA, fromFeatured } = this.props;
    const { title, android_url, ios_url } = experiment;
    const loading = (countryCode === null);
    const allowSMS = acceptedSMSCountries.includes(countryCode);
    const { isSuccess } = this.state;

    const handleAppLinkClick = () => {
      const platform = ios_url ? "ios" : "android";
      sendToGA("event", {
        eventCategory: "SMS Modal Interactions",
        eventAction: "mobile store click",
        eventLabel: `${platform}`,
        dimension11: experiment.slug,
        dimension13: fromFeatured ? "Featured Experiment" : "Experiment Detail"
      });
    };

    const headerMessage = ios_url
      ? <Localized id="mobileDialogMessageIOS" $title={title} b={<b></b>}>
        <p>Download <b>{title}</b> from the iOS App Store.</p>
      </Localized>
      : <Localized id="mobileDialogMessageAndroid" $title={title} b={<b></b>}>
        <p>Download <b>{title}</b> from the Google Play Store.</p>
      </Localized>;
    const headerImg = ios_url ? (<a href={ios_url} onClick={handleAppLinkClick} target="_blank" rel="noopener noreferrer"><img className="mobile-header-img" src={iconIos}/></a>) : (<a href={android_url} onClick={handleAppLinkClick} target="_blank" rel="noopener noreferrer"><img className="mobile-header-img" src={iconGoogle}/></a>);

    const learnMoreLink = "https://www.mozilla.org/privacy/websites/#campaigns";

    const notice = allowSMS
      ? <Localized id="mobileDialogNoticeSMSWithLink"
        a={<a target="_blank" rel="noopener noreferrer" href={learnMoreLink}></a>}>
        <p className="notice">
          SMS service available in select countries only. SMS &amp; data rates may apply.
          The intended recipient of the email or SMS must have consented.{" "}
          <a>Learn More</a>.
        </p>
      </Localized>
      : <Localized id="newsletterFormPrivacyNotice"
        a={<a target="_blank" rel="noopener noreferrer" href={learnMoreLink} />}>
        <p className="notice">
          I&apos;m okay with Mozilla handling my info as explained in <a>this privacy notice</a>.
        </p>
      </Localized>;

    return (
      <div className="modal-container mobile-modal" tabIndex="0"
        ref={modalContainer => { this.modalContainer = modalContainer; }}
        onKeyDown={e => this.handleKeyDown(e)}>
        <div className="modal feedback-modal modal-bounce-in">
          <header className="modal-header-wrapper">
            <Localized id="mobileDialogTitle">
              <h3 className="modal-header">Get the App</h3>
            </Localized>
            <div className="modal-cancel" onClick={() => this.close("cancel")}/>
          </header>
          <div className="modal-content centered default-background">
            <div className="header-wrapped">
              {headerMessage}
              {headerImg}
            </div>
            {loading && <Loading/>}
            {!loading && !isSuccess && this.renderForm()}
            {!loading && !isSuccess && notice}
            {isSuccess && this.renderSuccess()}
          </div>
        </div>
      </div>
    );
  }

  renderSuccess() {
    const { countryCode } = this.props;
    const allowSMS = acceptedSMSCountries.includes(countryCode);
    const secondaryId = allowSMS ? "mobileDialogSuccessSecondarySMS" : "mobileDialogSuccessSecondary";
    const secondaryText = allowSMS ? "Check your device for the email or text message." : "Check your device for the email.";

    return (
      <div className="success-section">
        <Localized id="mobileDialogSuccessMain">
          <p className="success-msg">Download link sent!</p>
        </Localized>
        <Localized id={secondaryId}>
          <p className="success-secondary">{secondaryText}</p>
        </Localized>
        <Localized id="mobileDialogButtonSuccess">
          <button className="button large secondary" onClick={() => this.close("close after success")}>Thanks!</button>
        </Localized>
        <Localized id="mobileDialogAnotherDeviceLink">
          <a href="#" className="send-to-device" onClick={this.reset}>Send to another device</a>
        </Localized>
      </div>

    );
  }

  validateRecipient = (value: string) => {
    const { countryCode } = this.props;
    const allowSMS = acceptedSMSCountries.includes(countryCode);
    if (allowSMS) {
      return (isValidNumber(value, countryCode) || validate(value));
    }
    return validate(value);
  }

  handleRecipientChange = (evt: Object) => {
    if (!this.state.submitAttempted) {
      return this.setState({
        recipient: evt.currentTarget.value
      });
    }

    return this.setState({
      isError: !this.validateRecipient(evt.currentTarget.value),
      recipient: evt.currentTarget.value
    });
  }

  renderForm = () => {
    const { countryCode } = this.props;
    const allowSMS = acceptedSMSCountries.includes(countryCode);
    const { isError, submitAttempted } = this.state;

    const errorId = allowSMS ? "mobileDialogErrorSMS" : "mobileDialogError";
    const errorText = allowSMS ? "Enter a valid phone number or email:" : "Enter a valid email:";
    const instructionId = allowSMS ? "mobileDialogInstructionsSMS" : "mobileDialogInstructions";
    const instructionText = allowSMS ? "Enter your phone number or email to send a download link to your phone:" : "Enter your email to send a download link to your phone:";

    return (
      <form className="mobile-link-form" data-no-csrf onSubmit={this.handleSubscribe}>
        {!submitAttempted && <Localized id={instructionId}>
          <p className="instruction">{instructionText}</p>
        </Localized>}

        {submitAttempted && isError && <Localized id={errorId}>
          <p className="error">{errorText}</p>
        </Localized>}

        {allowSMS && <Localized id="mobileDialogPlaceholderSMS" attrs={{placeholder: true}}>
          <input
            className={classnames({"input-error sms-input": isError && submitAttempted})}
            type="text"
            placeholder="Enter your Phone/Email"
            value={this.state.recipient}
            onChange={this.handleRecipientChange} />
        </Localized>
        }

        {!allowSMS && <Localized id="mobileDialogPlaceholder" attrs={{placeholder: true}}>
          <input
            className={classnames({"input-error email-input": isError && submitAttempted})}
            type="text"
            placeholder="Enter your Email"
            value={this.state.recipient}
            onChange={this.handleRecipientChange} />
        </Localized>
        }

        <Localized id="mobileDialogButton">
          <button className={"button large default"}>Send me the Download Link</button>
        </Localized>
      </form>
    );
  }

  focusModalContainer() {
    if (!this.modalContainer) {
      return;
    }
    this.modalContainer.focus();
  }

  handleSubscribe = (evt: Object) => {
    evt.preventDefault();

    const { recipient } = this.state;
    const { sendToGA, getWindowLocation, fromFeatured, experiment, countryCode } = this.props;
    const allowSMS = acceptedSMSCountries.includes(countryCode);
    const basketMsgId = `txp-${this.props.experiment.slug}`;
    const source = "" + getWindowLocation();

    // return early and show errors if submit attempt fails
    if (!this.validateRecipient(recipient)) return this.setState({submitAttempted: true, isError: true});

    if (allowSMS && isValidNumber(recipient, countryCode)) {
      sendToGA("event", {
        eventCategory: "SMS Modal Interactions",
        eventAction: "mobile link request",
        eventLabel: "sms",
        dimension11: experiment.slug,
        dimension13: fromFeatured ? "Featured Experiment" : "Experiment Detail"
      });
      // country, lang, msgId
      return subscribeToBasketSMS(recipient, countryCode, basketMsgId).then(response => {
        sendToGA("event", {
          eventCategory: "SMS Modal Interactions",
          eventAction: "request handled",
          eventLabel: response.ok ? "success" : "error",
          dimension11: experiment.slug,
          dimension13: fromFeatured ? "Featured Experiment" : "Experiment Detail"
        });
        this.setState({
          isSuccess: response.ok,
          isError: !response.ok
        });
      });
    }

    sendToGA("event", {
      eventCategory: "SMS Modal Interactions",
      eventAction: "mobile link request",
      eventLabel: "email",
      dimension11: experiment.slug,
      dimension13: fromFeatured ? "Featured Experiment" : "Experiment Detail"
    });

    return subscribeToBasket(recipient, source, basketMsgId).then(response => {
      sendToGA("event", {
        eventCategory: "SMS Modal Interactions",
        eventAction: "request handled",
        eventLabel: response.ok ? "success" : "error",
        dimension11: experiment.slug,
        dimension13: fromFeatured ? "Featured Experiment" : "Experiment Detail"
      });

      this.setState({
        isSuccess: response.ok,
        isError: !response.ok
      });
    });
  }

  reset = (e: Object) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState(DEFAULT_STATE);
    this.props.fetchCountryCode();
  }

  close = (label: string) => {
    if (label === "cancel" && this.state.isError) {
      label = "close after error";
    }

    const { onCancel, sendToGA, fromFeatured, experiment } = this.props;
    if (onCancel) {
      onCancel();
      sendToGA("event", {
        eventCategory: "SMS Modal Interactions",
        eventAction: "dialog dismissed",
        eventLabel: label,
        dimension11: experiment.slug,
        dimension13: fromFeatured ? "Featured Experiment" : "Experiment Detail"
      });
    }
  }

  handleKeyDown(e: Object) {
    if (e.key === "Escape") this.close("cancel");
  }
}
