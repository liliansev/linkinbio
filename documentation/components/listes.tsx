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
        <thead><tr><th>reseau</th><th>Name</th></tr></thead>
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
