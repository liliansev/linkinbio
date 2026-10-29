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
      <C k="cmd">curl</C> -X POST https://app.hopla.page/api/v2/blocks \{'\n'}
      {'  '}-H <C k="str">"Authorization: Bearer $HOPLA_API_KEY"</C> \{'\n'}
      {'  '}-H <C k="str">"Content-Type: application/json"</C> \{'\n'}
      {'  '}-d <C k="str">{`'{"title": "My podcast",`}</C>{'\n'}
      {'       '}<C k="str">{`"url": "https://example.com/podcast"}'`}</C>
    </>
  ),
  JavaScript: (
    <>
      <C k="cle">const</C> url = <C k="str">'https://app.hopla.page/api/v2/blocks'</C>;{'\n'}
      <C k="cle">const</C> r = <C k="cle">await</C> <C k="cmd">fetch</C>(url, {'{'}{'\n'}
      {'  '}method: <C k="str">'POST'</C>,{'\n'}
      {'  '}headers: {'{'}{'\n'}
      {'    '}Authorization: <C k="str">{'`Bearer ${process.env.HOPLA_API_KEY}`'}</C>,{'\n'}
      {'    '}<C k="str">'Content-Type'</C>: <C k="str">'application/json'</C>,{'\n'}
      {'  '}{'}'},{'\n'}
      {'  '}body: JSON.<C k="cmd">stringify</C>({'{'}{'\n'}
      {'    '}title: <C k="str">'My podcast'</C>,{'\n'}
      {'    '}url: <C k="str">'https://example.com/podcast'</C>,{'\n'}
      {'  '}{'}'}),{'\n'}
      {'}'});
    </>
  ),
  Python: (
    <>
      cle = os.environ[<C k="str">"HOPLA_API_KEY"</C>]{'\n'}
      r = requests.<C k="cmd">post</C>({'\n'}
      {'    '}<C k="str">"https://app.hopla.page/api/v2/blocks"</C>,{'\n'}
      {'    '}headers={'{'}<C k="str">"Authorization"</C>: <C k="str">f"Bearer {'{'}cle{'}'}"</C>{'}'},{'\n'}
      {'    '}json={'{'}{'\n'}
      {'        '}<C k="str">"title"</C>: <C k="str">"My podcast"</C>,{'\n'}
      {'        '}<C k="str">"url"</C>: <C k="str">"https://example.com/podcast"</C>,{'\n'}
      {'    '}{'}'},{'\n'}
      )
    </>
  ),
  Agent: (
    <>
      <C k="com">User</C>{'\n'}
      Add a link to my podcast at the top{'\n'}
      of my Hopla page: https://example.com/podcast{'\n\n'}
      <C k="com">Agent</C>{'  '}<C k="cmd">create_block</C>{'\n'}
      Done: "My podcast" is now at the top{'\n'}
      of hopla.page/camille.
    </>
  ),
};
type Langage = keyof typeof EXEMPLES;

export function Exemple() {
  const [langage, choisir] = useState<Langage>('curl');
  return (
    <div className="hd-exemple">
      <div className="hd-exemple-onglets" role="tablist" aria-label="Example language">
        {(Object.keys(EXEMPLES) as Langage[]).map(l => (
          <button key={l} type="button" role="tab" aria-selected={l === langage} className="hd-exemple-onglet" onClick={() => choisir(l)}>{l}</button>
        ))}
      </div>
      <pre className="hd-exemple-code" role="tabpanel" aria-label={`Create a link, ${langage}`}><code>{EXEMPLES[langage]}</code></pre>
      <div className="hd-exemple-reponse">
        {langage === 'Agent'
          ? <><span className="hd-exemple-statut">MCP</span><span>The same operation, through the Hopla MCP server.</span></>
          : <><span className="hd-exemple-statut">201</span><code>{'{ "block": { "id": "a1b2c3d4e5f6", "title": "My podcast", … } }'}</code></>}
      </div>
    </div>
  );
}
