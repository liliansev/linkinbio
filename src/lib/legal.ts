/*
 * Les textes légaux de Mes liens, servis sur /liens/legal/<document>. Toute
 * modification des CGU ou de l'accord de traitement change `VERSION_CGU` : les
 * comptes invités les acceptent à nouveau à leur prochaine connexion.
 *
 * Ce ne sont pas des textes d'avocat : ils décrivent fidèlement ce que fait le
 * code (durées dans `server/db.ts`, `CONSERVATION`). Une relecture par un
 * professionnel est prévue avant l'ouverture publique.
 */

import { TARIFS } from './abonnement.ts';

export const VERSION_CGU = '2026-10-17';
export const CONTACT_LEGAL = 'bonjour@liliansevoumian.fr';

export interface DocumentLegal { titre: string; resume: string; sections: { titre: string; texte: string[] }[] }

export const DOCUMENTS = ['cgu', 'traitement-des-donnees', 'confidentialite', 'sous-traitants', 'mentions-legales'] as const;
export type NomDocument = (typeof DOCUMENTS)[number];

const HEBERGEUR = 'Hostinger International Limited, 61 Lordou Vironos Street, 6023 Larnaca, Chypre';

export const LEGAL: Record<NomDocument, DocumentLegal> = {
  cgu: {
    titre: 'Conditions générales d’utilisation',
    resume: `Les règles du service Mes liens, en vigueur depuis le 17 octobre 2026 (version ${VERSION_CGU}).`,
    sections: [
      { titre: 'Le service', texte: [
        'Mes liens permet de publier une page de liens personnelle à l’adresse liliansevoumian.fr/liens/<pseudo>, et de la gérer depuis un back office. Le service est édité par Lilian Sevoumian (voir les mentions légales).',
        'Pendant la bêta, le service est ouvert sur invitation. Il existe en version gratuite et en offre Pro, payante (voir « L’offre Pro et son paiement »). Il peut évoluer, s’interrompre pour maintenance ou s’arrêter : dans ce dernier cas, tu es prévenu par e-mail au moins 30 jours avant, et tu peux exporter tes données jusqu’au dernier jour.',
      ] },
      { titre: 'Ton compte', texte: [
        'Tu te connectes avec ton adresse e-mail, par un lien à usage unique. Tu es responsable de l’accès à ta boîte mail : quiconque y accède peut ouvrir ton back office.',
        'Tu peux télécharger toutes tes données et supprimer ton compte à tout moment, depuis l’onglet Réglages. La suppression est immédiate et définitive.',
      ] },
      { titre: 'L’offre Pro et son paiement', texte: [
        `L’offre Pro retire la mention « Une page faite avec Mes liens », montre tes statistiques sur un an au lieu de sept jours, et porte la place pour les images à 200 Mo. Elle coûte ${TARIFS.mois.prix} € par mois ou ${TARIFS.an.prix} € par an, toutes taxes comprises, et se renouvelle automatiquement à la fin de chaque période.`,
        'Le paiement passe par Creem (creem.io), revendeur officiel de l’abonnement : c’est Creem qui te le vend, encaisse le paiement, t’envoie la facture et reverse la TVA. Ses conditions de vente s’ajoutent à celles-ci pour le paiement. Mes liens ne voit ni ne garde jamais ton numéro de carte.',
        'Tu peux résilier à tout moment, sans frais, depuis l’onglet Réglages (« Résilier mon abonnement ») : le Pro reste actif jusqu’à la fin de la période déjà payée, puis ta page repasse en gratuit avec tout son contenu. Rien n’est effacé.',
        'Tu disposes de 14 jours après ton premier paiement pour changer d’avis : écris à ' + CONTACT_LEGAL + ' et tu es remboursé en entier. Si le prix change, tu es prévenu par e-mail au moins 30 jours avant ; le nouveau prix ne s’applique qu’au renouvellement suivant, et tu peux résilier d’ici là.',
      ] },
      { titre: 'Ce que tu publies', texte: [
        'Tu restes propriétaire de ce que tu publies (textes, images, liens) et seul responsable de son contenu. Tu nous autorises à l’héberger et à l’afficher sur ta page, le temps que ton compte existe.',
        'Sont interdits : les contenus illégaux, les arnaques et le hameçonnage, les liens vers des logiciels malveillants, l’incitation à la haine ou à la violence, le harcèlement, les contenus pornographiques ou impliquant des mineurs, l’usurpation d’identité, et la reproduction d’œuvres ou d’images sans en avoir les droits.',
      ] },
      { titre: 'Signalements et modération', texte: [
        'Chaque page porte un lien « Signaler ». Tout signalement est lu par une personne, pas par un algorithme, et traité dans les meilleurs délais.',
        'Si une page enfreint ces règles ou la loi, elle peut être suspendue. Tu reçois alors un e-mail qui explique la décision, les faits et la règle en cause, et comment la contester : il suffit de répondre à ce message. La personne qui a signalé la page est informée de la décision si elle a laissé son adresse.',
        'En cas de contenu laissant craindre une infraction menaçant la vie ou la sécurité de quelqu’un, les autorités compétentes sont prévenues.',
      ] },
      { titre: 'Données personnelles', texte: [
        'Pour les données de ton compte, Mes liens est responsable de traitement (voir la politique de confidentialité). Pour les statistiques de visite de ta page, Mes liens agit pour ton compte, comme sous-traitant : l’accord de traitement des données fait partie de ces conditions.',
      ] },
      { titre: 'Responsabilité', texte: [
        'Le service est fourni tel quel, avec soin mais sans garantie de disponibilité permanente. Mes liens n’est pas responsable des sites vers lesquels pointent les liens publiés par les utilisateurs.',
      ] },
      { titre: 'Modifications et droit applicable', texte: [
        'Si ces conditions changent, tu es prévenu et tu les acceptes à nouveau à ta connexion suivante ; tu peux aussi supprimer ton compte.',
        'Ces conditions sont régies par le droit français. En cas de litige, une solution amiable est recherchée d’abord, en écrivant à ' + CONTACT_LEGAL + '.',
      ] },
    ],
  },

  'traitement-des-donnees': {
    titre: 'Accord de traitement des données',
    resume: `L’accord de sous-traitance prévu par l’article 28 du RGPD, entre toi (responsable de traitement) et Mes liens (sous-traitant), pour les données des visiteurs de ta page. Version ${VERSION_CGU}.`,
    sections: [
      { titre: 'Objet', texte: [
        'Mes liens mesure l’audience de ta page pour toi : nombre de vues, de visiteurs et de clics, provenance et type d’appareil. Il ne fait rien d’autre de ces données et ne les utilise pas pour son propre compte.',
      ] },
      { titre: 'Données traitées', texte: [
        'Pour chaque visite ou clic : la date, le lien cliqué, la provenance (site d’origine ou paramètre de campagne), le type d’appareil (mobile, ordinateur, tablette), et une empreinte anonyme du visiteur, recalculée chaque jour à partir d’un secret du serveur, de l’adresse IP et du navigateur. L’adresse IP elle-même n’est jamais enregistrée, aucun cookie n’est déposé chez le visiteur, et l’empreinte ne permet pas de le suivre d’un jour à l’autre ni d’un site à l’autre.',
      ] },
      { titre: 'Durée', texte: [
        'Les données sont gardées 13 mois au plus, puis effacées automatiquement. Elles sont effacées immédiatement si tu supprimes ton compte.',
      ] },
      { titre: 'Engagements de Mes liens', texte: [
        'Traiter les données uniquement sur tes instructions, c’est-à-dire pour afficher tes statistiques. Garantir la confidentialité des personnes qui y ont accès. Mettre en œuvre des mesures de sécurité adaptées : connexion sans mot de passe par lien à usage unique, sessions protégées, limites anti-abus. N’employer que les sous-traitants listés sur la page « Sous-traitants », et te prévenir de tout changement. T’aider à répondre aux demandes des personnes concernées. Te prévenir sans délai, et au plus tard sous 48 heures, de toute violation de données touchant ta page. Effacer les données à la fin du service, et te permettre de les exporter avant.',
      ] },
      { titre: 'Tes engagements', texte: [
        'Informer les visiteurs de ta page de la mesure d’audience (le lien « Confidentialité » en bas de ta page le fait pour toi), et ne pas ajouter à ta page de données personnelles de tiers sans base légale.',
      ] },
    ],
  },

  confidentialite: {
    titre: 'Politique de confidentialité',
    resume: 'Ce que Mes liens sait de toi, pourquoi, combien de temps, et comment exercer tes droits.',
    sections: [
      { titre: 'Qui est responsable', texte: [
        `Lilian Sevoumian, éditeur de Mes liens (voir les mentions légales). Pour toute question ou demande : ${CONTACT_LEGAL}.`,
      ] },
      { titre: 'Si tu visites une page', texte: [
        'Aucun cookie n’est déposé, aucune publicité, aucun traceur d’un site à l’autre. Le serveur compte les vues et les clics de la page pour son propriétaire, avec une empreinte anonyme renouvelée chaque jour ; ton adresse IP n’est pas enregistrée. Ces statistiques sont gardées 13 mois. C’est une mesure d’audience strictement limitée, qui entre dans l’exemption de consentement prévue par la CNIL.',
        'Tu peux t’y opposer : un navigateur qui bloque les requêtes vers /liens/api/evenement (la plupart des bloqueurs de contenus le permettent) n’est pas compté, sans que la page cesse de fonctionner. Le propriétaire de la page est responsable de ces statistiques ; Mes liens les traite pour lui.',
        'La page de Lilian Sevoumian (liliansevoumian.fr/liens/) utilise aussi DataFast, une mesure d’audience sans cookie. Les autres pages ne l’utilisent pas.',
      ] },
      { titre: 'Si tu as un compte', texte: [
        'Ton adresse e-mail, ton pseudo, la date de création et de dernière connexion, la version des conditions acceptées, et ce que tu publies (réglages, blocs, images). Base légale : l’exécution du contrat (les CGU). Ces données sont gardées tant que ton compte existe, et effacées dès que tu le supprimes.',
        'Si tu passes en Pro : l’identifiant de client et d’abonnement que Creem nous transmet, le statut de l’abonnement et sa date de renouvellement, pour savoir si ta page est en Pro. Ton nom, ton adresse de facturation et ta carte restent chez Creem, qui en est responsable pour le paiement et la facturation.',
        'Les liens de connexion et les sessions ne sont gardés que sous forme d’empreinte, et effacés à leur expiration (15 minutes, 7 jours pour une invitation, 90 jours pour une session).',
      ] },
      { titre: 'Si tu signales une page', texte: [
        'Le motif, ton explication et, si tu la donnes, ton adresse e-mail, pour te tenir informé de la décision. Base légale : l’obligation légale de traiter les signalements (règlement sur les services numériques). Gardés un an après la décision.',
      ] },
      { titre: 'Où vont les données', texte: [
        'Nulle part ailleurs que chez les sous-traitants listés sur la page dédiée : l’hébergeur, et le service d’envoi des e-mails. Pour un abonnement Pro, Creem reçoit ton adresse e-mail au moment du paiement. Rien n’est vendu ni partagé à des fins publicitaires.',
      ] },
      { titre: 'Tes droits', texte: [
        'Tu peux accéder à tes données, les corriger, les effacer, les récupérer dans un format lisible par une machine, t’opposer à un traitement ou en demander la limitation. Avec un compte, l’export et la suppression se font en un clic dans l’onglet Réglages. Pour le reste, écris à ' + CONTACT_LEGAL + ' : réponse sous un mois.',
        'Tu peux aussi saisir la CNIL (cnil.fr) si tu estimes que tes droits ne sont pas respectés.',
      ] },
    ],
  },

  'sous-traitants': {
    titre: 'Sous-traitants',
    resume: 'Les seules sociétés qui traitent des données pour Mes liens. Tout ajout est annoncé par e-mail aux comptes avant d’entrer en vigueur.',
    sections: [
      { titre: 'Hostinger', texte: [
        `Hébergement du serveur et de la base de données. ${HEBERGEUR} : société établie dans l’Union européenne.`,
      ] },
      { titre: 'Resend', texte: [
        'Envoi des e-mails : liens de connexion, invitations, décisions de modération. Ne reçoit que l’adresse du destinataire et le contenu du message. Resend, Inc., États-Unis ; le transfert est encadré par l’accord de traitement de Resend et les clauses contractuelles types de la Commission européenne.',
      ] },
      { titre: 'Creem', texte: [
        'Paiement de l’offre Pro (creem.io). Creem n’est pas un sous-traitant au sens strict : revendeur officiel de l’abonnement, il est responsable des données de paiement et de facturation qu’il collecte. Mes liens lui transmet ton adresse e-mail et l’identifiant de ton compte au moment du paiement, et reçoit en retour l’état de l’abonnement.',
      ] },
    ],
  },

  'mentions-legales': {
    titre: 'Mentions légales',
    resume: 'Qui édite et héberge Mes liens.',
    sections: [
      { titre: 'Éditeur', texte: [
        `Lilian Sevoumian, entrepreneur individuel. Contact : ${CONTACT_LEGAL}. Directeur de la publication : Lilian Sevoumian.`,
      ] },
      { titre: 'Hébergeur', texte: [HEBERGEUR + ', www.hostinger.com.'] },
      { titre: 'Contenus des utilisateurs', texte: [
        'Les pages publiées sur liliansevoumian.fr/liens/<pseudo> sont écrites par leurs auteurs, sous leur responsabilité. Pour signaler un contenu, utilise le lien « Signaler » en bas de la page concernée, ou écris à ' + CONTACT_LEGAL + '. Ce point de contact vaut aussi pour les autorités (règlement sur les services numériques, articles 11 et 12), en français ou en anglais.',
      ] },
    ],
  },
};

/** Les motifs proposés dans le formulaire de signalement. */
export const MOTIFS_SIGNALEMENT = [
  ['illegal', 'Contenu illégal'],
  ['arnaque', 'Arnaque, hameçonnage ou logiciel malveillant'],
  ['haine', 'Haine, violence ou harcèlement'],
  ['droits', 'Atteinte à mes droits (droit d’auteur, image, marque)'],
  ['usurpation', 'Usurpation d’identité'],
  ['mineurs', 'Contenu impliquant des mineurs'],
  ['autre', 'Autre'],
] as const;
export type MotifSignalement = (typeof MOTIFS_SIGNALEMENT)[number][0];
export const nomMotif = (m: string) => MOTIFS_SIGNALEMENT.find(([id]) => id === m)?.[1] ?? 'Autre';
