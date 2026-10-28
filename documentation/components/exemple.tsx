'use client';
import { useState } from 'react';

/*
 * L'exemple de l'accueil : un même geste (ajouter un lien) en curl, en JavaScript, en Python, ou demandé à un agent.
 * Les couleurs se posent à la main, sans coloration syntaxique chargée : quatre teintes suffisent.
 */
const C = ({ k, children }: { k: 'cmd' | 'str' | 'cle' | 'com'; children: React.ReactNode }) => <span className={`hd-c-${k}`}>{children}</span>;

const EXEMPLES = {
  curl: (
    <>
      <C k="cmd">curl</C> -X POST https://app.hopla.page/api/v1/blocs \{'\n'}
      {'  '}-H <C k="str">"Authorization: Bearer $HOPLA_CLE"</C> \{'\n'}
      {'  '}-H <C k="str">"Content-Type: application/json"</C> \{'\n'}
      {'  '}-d <C k="str">{`'{"titre": "Mon podcast",`}</C>{'\n'}
      {'       '}<C k="str">{`"url": "https://exemple.fr/podcast"}'`}</C>
    </>
  ),
  JavaScript: (
    <>
      <C k="cle">const</C> url = <C k="str">'https://app.hopla.page/api/v1/blocs'</C>;{'\n'}
      <C k="cle">const</C> r = <C k="cle">await</C> <C k="cmd">fetch</C>(url, {'{'}{'\n'}
      {'  '}method: <C k="str">'POST'</C>,{'\n'}
      {'  '}headers: {'{'}{'\n'}
      {'    '}Authorization: <C k="str">{'`Bearer ${process.env.HOPLA_CLE}`'}</C>,{'\n'}
      {'    '}<C k="str">'Content-Type'</C>: <C k="str">'application/json'</C>,{'\n'}
      {'  '}{'}'},{'\n'}
      {'  '}body: JSON.<C k="cmd">stringify</C>({'{'}{'\n'}
      {'    '}titre: <C k="str">'Mon podcast'</C>,{'\n'}
      {'    '}url: <C k="str">'https://exemple.fr/podcast'</C>,{'\n'}
      {'  '}{'}'}),{'\n'}
      {'}'});
    </>
  ),
  Python: (
    <>
      cle = os.environ[<C k="str">"HOPLA_CLE"</C>]{'\n'}
      r = requests.<C k="cmd">post</C>({'\n'}
      {'    '}<C k="str">"https://app.hopla.page/api/v1/blocs"</C>,{'\n'}
      {'    '}headers={'{'}<C k="str">"Authorization"</C>: <C k="str">f"Bearer {'{'}cle{'}'}"</C>{'}'},{'\n'}
      {'    '}json={'{'}{'\n'}
      {'        '}<C k="str">"titre"</C>: <C k="str">"Mon podcast"</C>,{'\n'}
      {'        '}<C k="str">"url"</C>: <C k="str">"https://exemple.fr/podcast"</C>,{'\n'}
      {'    '}{'}'},{'\n'}
      )
    </>
  ),
  Agent: (
    <>
      <C k="com">Toi</C>{'\n'}
      Ajoute en haut de ma page Hopla un lien{'\n'}
      vers mon podcast : https://exemple.fr/podcast{'\n\n'}
      <C k="com">Ton agent</C>{'  '}<C k="cmd">ajouter_bloc</C>{'\n'}
      C’est fait : « Mon podcast » est en haut{'\n'}
      de hopla.page/camille.
    </>
  ),
};
type Langage = keyof typeof EXEMPLES;

export function Exemple() {
  const [langage, choisir] = useState<Langage>('curl');
  return (
    <div className="hd-exemple">
      <div className="hd-exemple-onglets" role="tablist" aria-label="Langage de l’exemple">
        {(Object.keys(EXEMPLES) as Langage[]).map(l => (
          <button key={l} type="button" role="tab" aria-selected={l === langage} className="hd-exemple-onglet" onClick={() => choisir(l)}>{l}</button>
        ))}
      </div>
      <pre className="hd-exemple-code" role="tabpanel" aria-label={`Ajouter un lien, en ${langage}`}><code>{EXEMPLES[langage]}</code></pre>
      <div className="hd-exemple-reponse">
        {langage === 'Agent'
          ? <><span className="hd-exemple-statut">MCP</span><span>Le même geste, par le serveur MCP de Hopla.</span></>
          : <><span className="hd-exemple-statut">201</span><code>{'{ "bloc": { "id": "a1b2c3d4e5f6", "titre": "Mon podcast", … } }'}</code></>}
      </div>
    </div>
  );
}
