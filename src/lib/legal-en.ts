/*
 * Les textes légaux en anglais (8 novembre 2026, accord de Lilian : Hopla passe à l'anglais d'abord). Une traduction
 * fidèle de `legal.ts`, servie sous des adresses anglaises (`/legal/terms`…) : la version française fait foi, chaque
 * texte le dit dans sa dernière partie. Un changement d'un texte français se reporte ici dans le même commit.
 */

import { OFFRES, euros, montant } from './abonnement.ts';
import type { DocumentLegal, NomDocument } from './legal.ts';
import { CONTACT_LEGAL, VERSION_CGU } from './legal.ts';
import { EST_HOPLA_PAGE, INSTANCE, NOM_EDITEUR } from './instance.ts';
import { NOM_ADMIN, NOM_PUBLIC } from './types.ts';

/** « $9 per month or $79 per year (€9 and €79 in France) ». */
const prixDe = (p: 'starter' | 'pro' | 'premium') => `${montant(OFFRES[p].prix.mois, 'en', 'USD')} per month or ${montant(OFFRES[p].prix.an, 'en', 'USD')} per year (${euros(OFFRES[p].prix.mois, 'en')} and ${euros(OFFRES[p].prix.an, 'en')} in France)`;

/** Les adresses anglaises des textes légaux, sous /legal comme les françaises. */
export const SLUGS_EN: Record<NomDocument, string> = {
  cgu: 'terms',
  'traitement-des-donnees': 'data-processing',
  confidentialite: 'privacy',
  'sous-traitants': 'subprocessors',
  'mentions-legales': 'legal-notice',
};

const LANGUE = { titre: 'Language', texte: ['This is an English translation, provided for convenience. The French version is the one that legally applies: in case of any difference, it prevails.'] };

// Sur hopla.page, l'éditeur et l'hébergeur en anglais ; une instance garde ce qu'elle a posé.
const EDITEUR = EST_HOPLA_PAGE ? 'AURA GROUP, a French SARL (limited liability company) with share capital of €100, 5 avenue du Maréchal de Lattre de Tassigny, 94600 Choisy-le-Roi, France' : INSTANCE.editeur;
const HEBERGEUR = EST_HOPLA_PAGE ? 'Hostinger International Limited, 61 Lordou Vironos Street, 6023 Larnaca, Cyprus' : INSTANCE.hebergeur;

export const LEGAL_EN: Record<NomDocument, DocumentLegal> = {
  cgu: {
    titre: 'Terms of service',
    resume: `The rules of the Hopla service, in force since November 8, 2026 (version ${VERSION_CGU}).`,
    sections: [
      { titre: 'The service', texte: [
        'Hopla lets you publish a personal link page at ' + NOM_PUBLIC + '/<username>, and manage it from a dashboard at ' + NOM_ADMIN + '. The service is published by ' + (EST_HOPLA_PAGE ? 'the company ' : '') + NOM_EDITEUR + ' (see the legal notice).',
        'Hopla comes in a free version and in paid plans (see “Paid plans and payment”). It may change, pause for maintenance or shut down: in that last case, you are told by email at least 30 days ahead, and you can export your data until the last day.',
      ] },
      { titre: 'Your account', texte: [
        'You log in with your email address, through a single-use link. You are responsible for access to your inbox: anyone who can open it can open your dashboard.',
        'You can download all your data and delete your account at any time, from the Settings tab. Deletion is immediate and final. If you have a subscription, it is canceled at the same moment: no further payment goes out, and the current period is not refunded, except within 14 days of your first payment (see “Paid plans and payment”).',
      ] },
      { titre: 'Paid plans and payment', texte: [
        'The free version stays free forever: your page, with five blocks (section titles and texts don’t count), including your partner links with their “Ad” label, your videos and music played in the page, your latest YouTube video always up to date, your FAQ, your contact card, your address, galleries of three photos, your links restricted to people over 18, the order of your links based on the network your visitor comes from, and the twenty themes. Three paid plans add to it, each with everything the previous one includes.',
        'Every account starts with 14 days of Pro for free, with no card and no commitment. You are told by email three days before the trial ends; when it ends, nothing is charged and your page stays online in the free version. What the free version doesn’t include stops showing, but nothing is erased: picking a plan brings it back. You can pick a plan during the trial.',
        `Starter, at ${prixDe('starter')}: your page without the Hopla mention, unlimited blocks, your storefront (your products and their price, your booking, a button to support you, the promo code of your partner links), your contact form, galleries of up to twelve photos, your colors and font, your background image, your large profile photo, your links in a grid under a title, your links scheduled ahead, your customers’ reviews, your detailed analytics over 30 days, UTM tracking on your links and redirecting your page to another address. Pro, at ${prixDe('pro')}: your page based on the time and on the visitor’s country, drops, your email list, which you can connect to your newsletter or automation tool, with a gift in exchange for signing up, your latest posts read from your RSS feed, and your analytics over a year. Premium, at ${prixDe('premium')}, will add your own domain name and up to three pages; it is not on sale yet.`,
        'Visits to your page are counted in every version, but only paid plans show you your analytics: picking one also gives you the earlier ones, within the limit of its history.',
        'Prices include all taxes. The subscription renews automatically at the end of each period, monthly or yearly as you choose.',
        'Payment goes through Creem (creem.io), a service of Armitage Labs OÜ (Estonian registry no. 16977866, Rotermanni 14, 10111 Tallinn, Estonia), the official reseller of the subscription: Creem sells it to you, collects the payment, sends you the invoice and pays the VAT. Its terms of sale add to these ones for the payment. Hopla never sees or keeps your card number.',
        'You can change plans at any time from the Settings tab: the change applies right away, and Creem charges or refunds the difference, prorated over the current period.',
        'You can cancel at any time, at no cost, from the Settings tab (“Cancel my subscription”): your plan stays active until the end of the period already paid, then your page goes back to free. What the free version doesn’t include (your blocks beyond the first five, your colors, a countdown, a review, your storefront and promo codes, a rule based on time or country, a drop, a list form and its gift, your latest posts, your analytics) stops showing, but nothing is erased: picking a plan again brings it back. Dates already set on a block keep applying; setting new ones needs a plan.',
        'Pages created before October 21, 2026 keep, without a subscription, everything the free version included then: every feature except the page without the mention, and their analytics over seven days. The storefront, which came later, needs Starter. Pages created before October 25, 2026 also keep unlimited blocks.',
        'You have 14 days after your first payment to change your mind: write to ' + CONTACT_LEGAL + ' and you get a full refund. If the price changes, you are told by email at least 30 days ahead; the new price applies only from the next renewal, and you can cancel before then.',
      ] },
      { titre: 'What you publish', texte: [
        'You remain the owner of what you publish (texts, images, links) and solely responsible for its content. You allow us to host it and show it on your page, for as long as your account exists.',
        'Hopla sells nothing, books nothing and collects nothing for you: a product, a booking or a support button leads to the site that sells, books or receives the payment (your shop, Calendly, PayPal…), whose terms apply. You remain solely responsible for what you offer, the price shown and your obligations as a seller.',
        'A link published in exchange for payment or a benefit (affiliate, partnership, free product) carries the “Ad” or “Paid partnership” label, as required by the French law of June 9, 2023 on commercial influence: the “Partner link” block shows it for you, in every version.',
        'Forbidden: illegal content, scams and phishing, links to malware, incitement to hatred or violence, harassment, pornographic content or content involving minors, impersonation, fake reviews, made-up testimonials and misleading figures (“Reviews and proof” block), and copying works or images without holding the rights.',
        'A link to what the law reserves for adults (alcohol, gambling, mature content) carries the “Over 18 only” label: your page then asks the visitor to confirm their age before opening it. This label does not allow any of the forbidden content above.',
      ] },
      { titre: 'Reports and moderation', texte: [
        'Every page has a “Report” link. Every report is read by a person, not by an algorithm, and handled as soon as possible.',
        'If a page breaks these rules or the law, it may be suspended. You then receive an email explaining the decision, the facts and the rule involved, and how to appeal: just reply to that email. The person who reported the page is told of the decision if they left their address.',
        'When content suggests an offense threatening someone’s life or safety, the competent authorities are notified.',
      ] },
      { titre: 'Personal data', texte: [
        'For your account data, Hopla is the data controller (see the privacy policy). For your page’s visit analytics, Hopla acts on your behalf, as a processor: the data processing agreement is part of these terms.',
      ] },
      { titre: 'Liability', texte: [
        'The service is provided as is, with care but with no guarantee of permanent availability. Hopla is not responsible for the sites that links published by users point to.',
      ] },
      { titre: 'Changes and governing law', texte: [
        'If these terms change, you are told and you accept them again at your next login; you can also delete your account.',
        'These terms are governed by French law. In case of dispute, an amicable solution is sought first, by writing to ' + CONTACT_LEGAL + '.',
      ] },
      LANGUE,
    ],
  },

  'traitement-des-donnees': {
    titre: 'Data processing agreement',
    resume: `The processing agreement required by Article 28 of the GDPR, between you (controller) and Hopla (processor), for the data of your page’s visitors. Version ${VERSION_CGU}.`,
    sections: [
      { titre: 'Purpose', texte: [
        'Hopla measures your page’s audience for you: number of views, visitors and clicks, source, country and device type. If you add the “Join my list” block, Hopla also collects for you the addresses of the people who sign up. If you add “Contact me”, Hopla forwards to your inbox the messages your visitors leave there. It does nothing else with this data and doesn’t use it for its own purposes.',
      ] },
      { titre: 'Data processed', texte: [
        'For each visit or click: the date, the link clicked, the source (referring site or campaign parameter), the device type (mobile, computer, tablet), the country as Cloudflare infers it from the connection, and an anonymous visitor fingerprint, recomputed every day from a server secret, the IP address and the browser. The IP address itself is never stored, no cookie is set on the visitor’s device, and the fingerprint doesn’t allow following them from one day to the next or from one site to another.',
        'For the “Join my list” block: the email address, the first name if asked, the sign-up date and the source. These subscribers are kept until you remove them, or as long as your account exists. If you connect a tool in the Integrations tab (a newsletter such as Brevo, Mailchimp, Kit, MailerLite, beehiiv or Systeme.io, or a Make, Zapier or n8n webhook), each subscriber is sent to it on your instruction: this tool, which you choose, then acts for you, under your own contract with it. Your API key, or your webhook address, is encrypted on the server. Substack has no API: your subscribers only go there if you import them yourself.',
        'For “Contact me”: the name if given, the visitor’s email address and message, sent right away by email to your account’s address, with their address so you can reply. Hopla keeps no copy.',
      ] },
      { titre: 'Retention', texte: [
        'Data is kept for 13 months at most, then erased automatically. It is erased immediately if you delete your account.',
      ] },
      { titre: 'Hopla’s commitments', texte: [
        'Process the data only on your instructions, that is, to show your analytics. Ensure the confidentiality of the people who have access to it. Apply suitable security measures: passwordless login through single-use links, protected sessions, anti-abuse limits. Use only the subprocessors listed on the “Subprocessors” page, and tell you of any change. Help you answer requests from the people concerned. Tell you without delay, and within 48 hours at the latest, of any data breach affecting your page. Erase the data at the end of the service, and let you export it before.',
      ] },
      { titre: 'Your commitments', texte: [
        'Inform your page’s visitors of the audience measurement (the “Privacy” link at the bottom of your page does it for you), and not add third parties’ personal data to your page without a legal basis. For a subscriber list: only write to people for what your block announces, and allow unsubscribing in every email.',
      ] },
      LANGUE,
    ],
  },

  confidentialite: {
    titre: 'Privacy policy',
    resume: 'What Hopla knows about you, why, for how long, and how to exercise your rights.',
    sections: [
      { titre: 'Who is responsible', texte: [
        `${NOM_EDITEUR}, publisher of Hopla (see the legal notice). For any question or request: ${CONTACT_LEGAL}.`,
      ] },
      { titre: 'If you visit a page', texte: [
        'No cookie is set, no ads, no tracker across sites. The server counts the page’s views and clicks for its owner, with an anonymous fingerprint renewed every day, and your country, which Cloudflare infers from your connection; your IP address is not stored. Your country is also used, for the duration of the visit, to show or hide the links the owner restricts to some countries. These analytics are kept for 13 months. This is a strictly limited audience measurement, which falls under the consent exemption set by the CNIL (the French data protection authority).',
        'A video player (YouTube, Vimeo, TikTok) or music player (Spotify, Apple Music, Apple Podcasts, Deezer, SoundCloud), the map of an address (Google Maps), like the calendar of a booking (Calendly, Cal.com, Google Calendar), only loads in the page if you tap it: that service then applies its own rules, cookies included. The latest posts of a blog or podcast, and the latest video of a channel, are read by Hopla’s server: your browser only contacts that site if you open a post. A product, a support button or a link takes you to another site, which has its own rules; if the page owner chose it, that link tells the destination site you come from Hopla (utm_source=hopla), without saying anything about you.',
        'You can object: a browser that blocks requests to ' + NOM_PUBLIC + '/api/evenement (most content blockers allow it) is not counted, and the page keeps working. The page owner is responsible for these analytics; Hopla processes them on their behalf.',
        'If you sign up to a page’s list (“Join my list”), your address and, if asked, your first name go to its owner, who alone decides which emails to send you; they may pass them to their sending or automation tool (Brevo, Mailchimp, Kit, Substack or Make, for example). If the page offers a gift for signing up, its link opens once you give your address, on the site where the owner put it. To unsubscribe or have your address erased, write to them, or to ' + CONTACT_LEGAL + '.',
        'If you write through “Contact me”, your name, address and message go by email to the page owner, who replies to that address; Hopla doesn’t keep them. Saving a contact card to your contacts tells Hopla nothing about you.',
        'For a restricted-access link (drop mode), Hopla keeps, to count the spots, an encrypted fingerprint specific to that link, derived from your IP address and browser: it serves only that purpose, doesn’t allow following you from one link to another, and is erased after thirteen months.',
      ] },
      { titre: 'If you reserve your name', texte: [
        'Your email address and the chosen name, to hold that name for you, confirm the reservation and send you your invite. Legal basis: your request (pre-contractual measures). Kept until your invite, and erased after one year at most. To erase them sooner, reply to the confirmation email or write to ' + CONTACT_LEGAL + '.',
      ] },
      { titre: 'If you have an account', texte: [
        'Your email address, your username, the creation and last login dates, the version of the terms you accepted, and what you publish (settings, blocks, images). Legal basis: performance of the contract (the terms of service). This data is kept as long as your account exists, and erased as soon as you delete it. A page you never enter (no login link used) is erased with your address one month after its creation, once the links sent to you and any plan offered to you have expired: its name becomes free again.',
        'If you pick a paid plan: the customer, subscription and product IDs Creem sends us, the subscription status and its renewal date, to know which plan your page has. Your name, billing address, card and invoices stay with Creem, which is responsible for them for payment and billing. Deleting your account cancels your subscription with Creem; if Creem doesn’t confirm it, the publisher receives your username and these IDs by email, long enough to cancel it by hand.',
        'If the publisher offers you a plan: which one, the day it was offered and its end, to know which plan your page has.',
        'Login links and sessions are only kept as a fingerprint, and erased when they expire (15 minutes, 24 hours for a link the publisher sends you, 7 days for an invite, 90 days for a session).',
      ] },
      { titre: 'If you report a page', texte: [
        'The reason, your explanation and, if you give it, your email address, to keep you informed of the decision. Legal basis: the legal obligation to handle reports (Digital Services Act). Kept for one year after the decision.',
      ] },
      { titre: 'Protection against attacks', texte: [
        'Visits to ' + NOM_PUBLIC + ' and to the dashboard go through Cloudflare, which stops attacks and bots before the server. Cloudflare then sees your IP address, your browser and the address requested, long enough to route the request; it sets no cookie. Legal basis: Hopla’s legitimate interest in protecting the service and the people who use it.',
        'Public forms (login, page creation, report, “Join my list”, “Contact me”) also go through Turnstile, Cloudflare’s anti-bot check. It only loads when you use one of them, and only shows a checkbox to a visitor deemed suspicious.',
      ] },
      { titre: 'Where the data goes', texte: [
        'Nowhere other than the subprocessors listed on their page: the host, the email delivery service, and Cloudflare, which protects the service. For a subscription, Creem receives your email address at payment time. Nothing is sold or shared for advertising.',
      ] },
      { titre: 'Your rights', texte: [
        'You can access your data, correct it, erase it, get it in a machine-readable format, object to a processing or ask for it to be restricted. With an account, export and deletion take one click in the Settings tab. For the rest, write to ' + CONTACT_LEGAL + ': answer within one month.',
        'You can also file a complaint with the CNIL (cnil.fr), or with your own country’s data protection authority, if you believe your rights are not respected.',
      ] },
      LANGUE,
    ],
  },

  'sous-traitants': {
    titre: 'Subprocessors',
    resume: 'The only companies that process data for Hopla. Any addition is announced to accounts by email before it takes effect.',
    sections: [
      { titre: 'Hostinger', texte: [
        `Hosting of the server and the database. ${HEBERGEUR}: a company established in the European Union.`,
      ] },
      { titre: 'Resend', texte: [
        'Sending emails: login links, name reservations, invites, moderation decisions, messages left through “Contact me”. Receives only the recipient’s address and the content of the message. Resend, Inc., United States; the transfer is covered by Resend’s data processing agreement and the European Commission’s standard contractual clauses.',
      ] },
      { titre: 'Cloudflare', texte: [
        'Protection and routing of traffic to ' + NOM_PUBLIC + ' and ' + NOM_ADMIN + ', and anti-bot checks on public forms (Turnstile). Sees the IP address, the browser and the address requested for each visit, long enough to route it; sets no cookie. Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, United States; the transfer is covered by Cloudflare’s data processing agreement and the European Commission’s standard contractual clauses.',
      ] },
      { titre: 'Creem', texte: [
        'Payment of paid plans (creem.io), by Armitage Labs OÜ, Rotermanni 14, 10111 Tallinn, Estonia. Creem is not a processor in the strict sense: as the official reseller of the subscription, it is responsible for the payment and billing data it collects. Hopla sends it your email address and your account ID at payment time, and receives back the subscription status.',
      ] },
      LANGUE,
    ],
  },

  'mentions-legales': {
    titre: 'Legal notice',
    resume: 'Who publishes and hosts Hopla.',
    sections: [
      { titre: 'Publisher', texte: [
        ...(EST_HOPLA_PAGE ? [
          `${EDITEUR}. SIREN 991 735 036, RCS Créteil, head office SIRET 991 735 036 00014, EU VAT number FR71991735036.`,
          `Contact: ${CONTACT_LEGAL}, +33 6 67 03 66 74. Publication director: ${INSTANCE.directeur}.`,
        ] : [`${EDITEUR}.`, `Contact: ${CONTACT_LEGAL}. Publication director: ${INSTANCE.directeur}.`]),
      ] },
      { titre: 'Host', texte: [EST_HOPLA_PAGE ? HEBERGEUR + ', www.hostinger.com.' : HEBERGEUR + '.'] },
      { titre: 'User content', texte: [
        'Pages published at ' + NOM_PUBLIC + '/<username> are written by their authors, under their responsibility. To report content, use the “Report” link at the bottom of the page concerned, or write to ' + CONTACT_LEGAL + '. This point of contact also serves the authorities (Digital Services Act, Articles 11 and 12), in French or in English.',
      ] },
      LANGUE,
    ],
  },
};

/** Le document et la langue d'une adresse de /legal : un slug français ou anglais. */
export function documentDeSlug(slug: string): { nom: NomDocument; langue: 'fr' | 'en' } | null {
  for (const [nom, en] of Object.entries(SLUGS_EN) as [NomDocument, string][]) {
    if (slug === nom) return { nom, langue: 'fr' };
    if (slug === en) return { nom, langue: 'en' };
  }
  return null;
}

/** L'adresse d'un texte légal dans une langue : « /legal/terms », « /legal/cgu ». */
export const cheminLegal = (nom: NomDocument, langue: 'fr' | 'en') => `/legal/${langue === 'en' ? SLUGS_EN[nom] : nom}`;
