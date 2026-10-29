import genere from '@/lib/genere.json';

/* Les listes tirées du code de l'app par scripts/openapi.ts : elles suivent Hopla sans qu'on les recopie. */
export function ListeThemes() {
  return (
    <div className="hd-table">
      <table>
        <thead><tr><th>id</th><th>Name</th><th>Mood</th></tr></thead>
        <tbody>
          {genere.themes.map(t => (
            <tr key={t.id}><td><code>{t.id}</code></td><td>{t.nom}</td><td>{t.humeur}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListeReseaux() {
  return (
    <div className="hd-table">
      <table>
        <thead><tr><th>network</th><th>Name</th></tr></thead>
        <tbody>{genere.reseaux.map(r => <tr key={r.id}><td><code>{r.id}</code></td><td>{r.nom}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function ListePictos() {
  return <p className="hd-puces">{genere.pictos.map(p => <code key={p.nom} title={p.libelle}>{p.nom}</code>)}</p>;
}

export function ListeTypes() {
  return <p className="hd-puces">{genere.types.map(t => <code key={t}>{t}</code>)}</p>;
}

type TableV1 = 'routes' | 'parametres' | 'champs' | 'types' | 'valeurs' | 'fonctions' | 'codes' | 'outils';

/** Le passage de la v1 à la v2 : chaque ancien nom, et le nouveau (tirés du dictionnaire de l'API). */
export function TableV1({ quoi }: { quoi: TableV1 }) {
  return (
    <div className="hd-table">
      <table>
        <thead><tr><th>v1</th><th>v2</th></tr></thead>
        <tbody>{(genere.v1[quoi] as string[][]).map(([v1, v2]) => <tr key={v1}><td><code>{v1}</code></td><td><code>{v2}</code></td></tr>)}</tbody>
      </table>
    </div>
  );
}
