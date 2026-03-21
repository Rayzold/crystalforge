export function renderDistrictPanel(state) {
  return `
    <section class="panel district-panel">
      <div class="panel__header">
        <h3>Districts</h3>
        <span class="panel__subtle">Synergy thresholds: 3 / 6 / 10 / 15</span>
      </div>
      <div class="district-panel__list">
        ${state.districtSummary
          .map(
            (district) => `
              <article class="district-row">
                <div>
                  <h4>${district.name}</h4>
                  <p>${district.bonusText}</p>
                </div>
                <div class="district-row__meta">
                  <span>Buildings ${district.buildingCount}</span>
                  <strong>Level ${district.level}</strong>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
