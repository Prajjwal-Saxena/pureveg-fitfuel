import { useState } from "react";
import type { CartItem, MenuItem } from "../types";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function MealCard({ item, onAdd }: { item: MenuItem; onAdd: (item: CartItem) => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const size = item.sizes[selectedIndex];
  const highlights = [item.userSegments[0], item.healthGoals[0], item.dietaryTags[0]].filter(Boolean).slice(0, 3);

  return (
    <article className="meal-card">
      <div className="meal-image">
        <img src={item.image} alt={item.name} />
      </div>
      <div className="meal-content">
        <div className="meal-meta">
          <span>{item.mealWindow}</span>
          <span>{item.category}</span>
        </div>
        <h4>{item.name}</h4>
        <p>{item.description}</p>
        <div className="macro-tags">
          <span>{item.macros.protein}g protein</span>
          <span>{item.macros.calories} kcal</span>
          <span>{item.macros.carbs}g carbs</span>
        </div>
        {highlights.length ? (
          <div className="macro-tags subtle">
            {highlights.map((entry) => (
              <span key={`${item.id}-${entry}`}>{entry.replaceAll("-", " ")}</span>
            ))}
          </div>
        ) : null}
        <div className="size-row">
          {item.sizes.map((entry, index) => (
            <button
              key={`${item.id}-${entry.label}`}
              className={selectedIndex === index ? "active" : ""}
              type="button"
              onClick={() => setSelectedIndex(index)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="meal-footer">
          <div>
            <strong>{money.format(size.price)}</strong>
            <span>
              {size.grams}g • {size.protein}g protein
            </span>
          </div>
          <button
            className="primary small"
            type="button"
            onClick={() =>
              onAdd({
                key: `${item.id}:${size.label}`,
                id: item.id,
                price: size.price,
                quantity: 1,
                name: `${item.name} (${size.label})`
              })
            }
          >
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
