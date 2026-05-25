export function InfoCard({ image, title, text }: { image: string; title: string; text: string }) {
  return (
    <article className="info-card">
      <img src={image} alt={title} />
      <h4>{title}</h4>
      <p>{text}</p>
    </article>
  );
}
