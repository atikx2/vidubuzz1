// Plain text only. Never render administrator-authored HTML or arbitrary script/style tags.
export function InformationBody({ body }: { body: string }) {
  return <div className="information-body">{body.split(/\n\s*\n/).filter((part) => part.trim()).map((part, index) => part.trim().startsWith("## ")
    ? <h2 key={index}>{part.trim().slice(3)}</h2> : <p key={index}>{part.trim()}</p>)}</div>;
}
