import Immutable from 'immutable';
import React, { Component, PropTypes } from 'react';
import { Events } from '../Store';
import Document from '../Document';
import debounce from 'lodash.debounce';

import Header from './Header';
import Editor from './Editor';
import Footer from './Footer';
import MessageBoxes from './MessageBox';

const { object, string } = PropTypes;


export default class App extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      document: new Document(),
      messages: new Immutable.List(),
      loaded: false
    };

    this.updateContent = debounce(this.updateContent, 150);
  }

  getChildContext() {
    // Pass the controller to child components.
    return {
      controller: this.props.controller
    };
  }

  componentDidMount() {
    this.props.controller.on(Events.NO_DOCUMENT_ID, (state) => {
      this.setState({
        loaded: true,
        document: state.document
      });
    });

    this.props.controller.on(Events.DECRYPTION_FAILED, (state) => {
      const message = {
        content: [
          'We were unable to decrypt the document. Either the secret has not',
          'been supplied or it is invalid.',
          'We have redirected you to a new document.'
        ].join(' '),
        type: 'error'
      };

      this.loadAndRedirect(state.document, '/', message);
    });

    this.props.controller.on(Events.DOCUMENT_NOT_FOUND, (state) => {
      const message = {
        content: [
          'We could not find the document you were trying to load, so we have',
          'redirected you to a new document.'
        ].join(' '),
        type: 'error'
      };

      this.loadAndRedirect(state.document, '/', message);
    });

    this.props.controller.on(Events.CONFLICT, (state) => {
      const message = {
        content: (
          <span>
            <i>Snap!</i>&nbsp;
            The document you were working on has been updated by a third,
            and you are now working on a fork. You can still find the original
            (and updated) document:&nbsp;
            <a href={`/${state.document.uuid}#${state.secret}`}>here</a>.
          </span>
        ),
        type: 'warning'
      };

      this.loadAndRedirect(
        state.fork.document,
        `/${state.fork.document.uuid}#${state.fork.secret}`,
        message
      );
    });

    this.props.controller.on(Events.UPDATE_WITHOUT_CONFLICT, (state) => {
      const message = {
        content: [
          'We have updated the document you are viewing to its latest revision.',
          'Happy reading/working!'
        ].join(' '),
        type: 'info'
      };

      this.setState({
        document: state.document,
        messages: this.state.messages.push(message)
      });
    });

    this.props.controller.on(`${Events.SYNCHRONIZE}, ${Events.CHANGE}`, (state) => {
      this.loadAndRedirect(
        state.document,
        `/${state.document.uuid}#${state.secret}`
      );
    });

    this.props.controller.dispatch('action:init', {
      id: window.location.pathname.slice(1),
      secret: window.location.hash.slice(1)
    });
  }

  loadAndRedirect(doc, uri, message) {
    if (message) {
      this.state.messages.push(message);
    }

    this.setState({
      loaded: true,
      document: doc,
      messages: this.state.messages
    });

    if (!window.history.state || !window.history.state.uuid ||
        (window.history.state && window.history.state.uuid &&
        doc.get('uuid') !== window.history.state.uuid)
    ) {
      window.history.pushState({ uuid: doc.get('uuid') }, `Monod - ${doc.get('uuid')}`, uri);
    }
  }

  updateContent(newContent) {
    const doc = this.state.document;

    if (doc.content !== newContent) {
      this.props.controller.dispatch('action:update', new Document({
        uuid: doc.get('uuid'),
        content: newContent,
        last_modified: doc.get('last_modified'),
        last_modified_locally: doc.get('last_modified_locally')
      }));
    }
  }

  removeMessage(index) {
    this.setState({
      messages: this.state.messages.delete(index)
    });
  }

  hideHelp(){
    let modal = document.getElementById('help-modal');

    if(modal.style.display == 'block'){
      modal.style.display = 'none';
    }else{
      modal.style.display = 'block';
    }
  }

  render() {
    return (
      <div className="layout">
        <div className="reveal" id="help-modal" data-reveal>
          <h1>Ouf je suis sauvé!</h1>
          <p className="lead">Impression en pdf</p>
          <p>
            L'application a été testé avec Chrome. Il est possible de demander dans <br/>
            le navigateur l'impression de la page de maniere classique ou dans un PDF.<br/>
            <br/>
            Pour que s'affiche correctement, il faut s'assurer de certains paramètres dans<br/>
            le panneau d'impression. Déplier les options en cliquant sur 'Plus de paramètres'<br/>
            puis dans la section Options, Graphiques d'arrière-plan doit être coché.<br/>
            Pour un meilleur effet, jouez avec les marges (Aucun, par exemple).
          </p>
          <p className="lead">Décrire une expérience</p>
          <p>
            Les experiences doivent être délimitées par des marquers pour définir<br/>
            les styles qui doivent être appliqués :<br/>
            --experience-start<br/>
            --experience-end<br/>
            <br/>
            Entre ces deux marquers, le premier élément doit être un titre :<br/>
            # Votre role pour la mission<br/>
            <br/>
            Le deuxiement élément doit être un titre de second niveau :<br/>
            ## Le nom du client<br/>
            <br/>
            Pour créer une section avec un descriptif puis des points, il faut avoir<br/>
            deux niveaux de liste<br/>
            * La description de votre paragraphe<br/>
              * Un détail<br/>
              * puis un autre<br/><br/>
          </p>

          <p className="lead">Déclaration des variables</p>
          <p>
            Au début du document, se situe une section entre '---'. Dans cette<br/>
            section il doit être définit un certain nombre de variables (nom prénom,<br/>
            role, expérience, ...). Les variables manquantes seront alors affiché dans<br/>
            le template avec [nomdevariable].<br/>
            Pour les listes il est possible d'ajouter autant d'élément que souhaité, il<br/>
            suffit d'incrémenter le nombre.<br/><br/>
          </p>

          <p className="lead">Utilisation des images pour les expertises</p>
          <p>
            Il existe un nombre limité d'icon pour illustrer les expertises. Pour les<br/>
            utiliser, il faut fans la liste d'expertise utiliser un marquer de la forme :<br/>
            --expertise-archive.<br/>
            <br/>
            Voici l'ensemble des marquers disponibles:<br/>
            --expertise-archive<br/>
            --expertise-cloud<br/>
            --expertise-file<br/>
            --expertise-flag<br/>
            --expertise-leaf<br/>
            --expertise-talk<br/><br/>
          </p>

          <p className="lead">Sauter à la page suivante</p>
          <p>
            Le marquer permet de sauter une page, c'est surtout utile pour définir<br/>
            ce qui doit être affiché sur la premiere page :<br/>
            --break-page<br/>
          </p>

          <button className="close-button" data-close aria-label="Close modal" type="button" onClick={this.hideHelp}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <MessageBoxes
          messages={this.state.messages}
          closeMessageBox={this.removeMessage.bind(this)}
        />
        <Editor
          loaded={this.state.loaded}
          content={this.state.document.get('content')}
          onContentUpdate={this.updateContent.bind(this)}
        />
        <Footer version={this.props.version} />
      </div>
    );
  }
}

App.propTypes = {
  version: string.isRequired,
  controller: object.isRequired
};

App.childContextTypes = {
  controller: object
};
