import test from 'node:test';
import assert from 'node:assert/strict';
import { boiteMail } from './boiteMail.ts';

test('la boîte mail se reconnaît à son domaine, majuscules et espaces compris', () => {
  assert.equal(boiteMail('zoe@gmail.com')?.nom, 'Gmail');
  assert.equal(boiteMail('  Zoe@GoogleMail.com ')?.nom, 'Gmail');
  assert.equal(boiteMail('zoe@hotmail.fr')?.nom, 'Outlook');
  assert.equal(boiteMail('zoe@orange.fr')?.nom, 'Mail Orange');
  assert.equal(boiteMail('zoe@icloud.com')?.nom, 'iCloud Mail');
});

test('Gmail s’ouvre sur les e-mails de Hopla, indésirables compris', () => {
  assert.match(boiteMail('zoe@gmail.com')!.url, /from%3Ahopla\.page\+in%3Aanywhere/);
});

test('une messagerie inconnue, ou une adresse sans domaine, ne propose rien', () => {
  assert.equal(boiteMail('zoe@atelier-zoe.fr'), null);
  assert.equal(boiteMail('zoe'), null);
  assert.equal(boiteMail(''), null);
});
