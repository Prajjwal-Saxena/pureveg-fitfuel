import { MealCard } from "./MealCard";
import type { CartItem, MenuItem, PersonalizedCatalogPayload } from "../types";

const SECTION_COPY: Record<keyof PersonalizedCatalogPayload["sections"], { title: string; text: string }> = {
  forYou: {
    title: "Recommended for you",
    text: "Ranked using your saved goal, segment, budget, and medical-condition context."
  },
  budgetFriendly: {
    title: "Budget-friendly wins",
    text: "Lower-ticket meals that still stay aligned with your profile."
  },
  highProtein: {
    title: "Protein-first picks",
    text: "Strong candidates for recovery, satiety, and gym consistency."
  },
  conditionSupport: {
    title: "Condition-aware support",
    text: "Meals surfaced for the health conditions you saved in your profile."
  },
  quickMeals: {
    title: "Quick meals for busy days",
    text: "Faster, work-friendly picks for office and work-from-home routines."
  }
};

export function PersonalizedSections({
  personalized,
  onAdd
}: {
  personalized: PersonalizedCatalogPayload | null;
  onAdd: (item: CartItem, meal: MenuItem) => void;
}) {
  if (!personalized) {
    return null;
  }

  return (
    <section className="personalized-panel">
      <div className="section-copy">
        <span className="pill">AI discovery</span>
        <h3>Profile-shaped meal discovery</h3>
        <p>This is the first step toward adaptive recommendation memory: the catalog is now organized around who you are, not just what exists.</p>
      </div>

      {(
        Object.entries(personalized.sections) as Array<[keyof PersonalizedCatalogPayload["sections"], MenuItem[]]>
      )
        .filter(([, items]) => items.length > 0)
        .map(([key, items]) => (
          <div className="personalized-group" key={key}>
            <div className="personalized-header">
              <div>
                <h4>{SECTION_COPY[key].title}</h4>
                <p>{SECTION_COPY[key].text}</p>
              </div>
            </div>
            <div className="menu-grid compact-grid">
              {items.map((item) => (
                <MealCard
                  key={`${key}-${item.id}`}
                  item={item}
                  onAdd={(cartItem) => onAdd(cartItem, item)}
                />
              ))}
            </div>
          </div>
        ))}
    </section>
  );
}
