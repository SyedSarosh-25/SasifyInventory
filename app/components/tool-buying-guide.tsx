import { Money } from './currency';
import { toolBuyingGuide } from '../tool-buying-guides';

export function ToolBuyingGuide({ slug }: { slug: string }) {
  const guide = toolBuyingGuide(slug);
  if (!guide) return null;
  return <section className="tool-buying-guide" aria-labelledby="tool-comparison-heading">
    <h2 id="tool-comparison-heading">Compare access, activation and warranty</h2>
    <p>{guide.intro}</p>
    {guide.comparisons.length > 0 && (
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Allow keyboard users to scroll the comparison horizontally.
      <section className="tool-comparison-scroll" aria-label="Plan comparison" tabIndex={0}>
      <table className="tool-comparison-table">
        <caption>Listed package prices in PKR; confirm current price and stock on the product page before checkout.</caption>
        <thead><tr><th scope="col">Plan and listed price</th><th scope="col">Access arrangement</th><th scope="col">Activation requirements</th><th scope="col">Warranty differences</th></tr></thead>
        <tbody>{guide.comparisons.map((row) => <tr key={row.href}>
          <th scope="row"><a href={row.href}>{row.name}</a><span className="tool-comparison-price"><Money amount={row.price} /></span></th>
          <td>{row.access}</td><td>{row.activation}</td><td>{row.warranty}</td>
        </tr>)}</tbody>
      </table>
    </section>)}
    <div className="tool-guide-details">
      <section aria-labelledby="tool-activation-heading"><h2 id="tool-activation-heading">Before you activate your plan</h2>
        <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      </section>
      <section aria-labelledby="tool-questions-heading"><h2 id="tool-questions-heading">Questions before buying</h2>
        <div className="faq-list">{guide.questions.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>
    </div>
    <nav className="tool-guide-links" aria-label="Buying and support policies"><a href="/buying-guide">Compare access types</a><a href="/warranty">Warranty policy</a><a href="/refunds">Refund policy</a></nav>
  </section>;
}
