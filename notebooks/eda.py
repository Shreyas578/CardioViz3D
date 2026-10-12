"""
CardioViz3D — Exploratory Data Analysis Script
Z-Alizadeh Sani Dataset: Cardiovascular Risk & Multi-Vessel Stenosis

Run: python eda.py
Outputs saved to: eda_outputs/
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import os
import warnings

warnings.filterwarnings('ignore')

# ─── Setup ────────────────────────────────────────────────────────────────────
OUTPUT_DIR = 'eda_outputs'
os.makedirs(OUTPUT_DIR, exist_ok=True)

DATA_PATH = '../backend/data/raw/extention of Z-Alizadeh sani dataset.xlsx'

plt.style.use('dark_background')
PALETTE = ['#60A5FA', '#34D399', '#F59E0B', '#F87171']

# ─── Load Data ────────────────────────────────────────────────────────────────
print("Loading dataset...")
df = pd.read_excel(DATA_PATH)
print(f"Shape: {df.shape}")

TARGET_COLS = ['Cath', 'LAD', 'LCX', 'RCA']

# Encode targets
for col in TARGET_COLS:
    if col in df.columns:
        df[col] = df[col].apply(lambda x: 1 if str(x).strip().lower() in ['cad', 'stenotic'] else 0)

df_features = df.drop(columns=TARGET_COLS)

numeric_cols = df_features.select_dtypes(include=['number']).columns.tolist()
cat_cols     = df_features.select_dtypes(exclude=['number']).columns.tolist()

print(f"  Numeric features: {len(numeric_cols)}")
print(f"  Categorical features: {len(cat_cols)}")
print(f"  Target prevalence:")
for t in TARGET_COLS:
    n = df[t].sum()
    print(f"    {t}: {n}/{len(df)} ({100*n/len(df):.1f}% positive)")

# ─── 1. Target Class Distribution ─────────────────────────────────────────────
fig, axes = plt.subplots(1, 4, figsize=(16, 4))
fig.patch.set_facecolor('#0F172A')
for ax, col, color in zip(axes, TARGET_COLS, PALETTE):
    counts = df[col].value_counts()
    ax.bar(['Negative', 'Positive'], counts.values, color=[color + '80', color],
           edgecolor='white', linewidth=0.5)
    ax.set_title(f'{col} Distribution', color='white', fontsize=12, pad=10)
    ax.set_facecolor('#1E293B')
    ax.tick_params(colors='#94A3B8')
    for spine in ax.spines.values(): spine.set_edgecolor('#334155')
    for i, v in enumerate(counts.values):
        ax.text(i, v + 1, f'{v}\n({100*v/len(df):.1f}%)', ha='center', va='bottom',
                color='white', fontsize=9)

fig.suptitle('Target Class Distributions — Z-Alizadeh Sani Dataset',
             color='white', fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, '1_class_distributions.png'), dpi=150, bbox_inches='tight',
            facecolor='#0F172A')
plt.close()
print("[OK] 1_class_distributions.png")

# ─── 2. Age Distribution by CAD Status ────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5))
fig.patch.set_facecolor('#0F172A')
ax.set_facecolor('#1E293B')
for status, color, label in [(0, '#34D399', 'CAD Negative'), (1, '#F87171', 'CAD Positive')]:
    subset = df[df['Cath'] == status]['Age'].dropna()
    ax.hist(subset, bins=20, alpha=0.7, color=color, label=label, edgecolor='white', linewidth=0.3)
    ax.axvline(subset.mean(), color=color, linestyle='--', linewidth=1.5,
               label=f'{label} mean: {subset.mean():.1f}')
ax.set_xlabel('Age (years)', color='#94A3B8')
ax.set_ylabel('Count', color='#94A3B8')
ax.set_title('Age Distribution by CAD Status', color='white', fontsize=13, fontweight='bold')
ax.legend(framealpha=0.3, labelcolor='white')
ax.tick_params(colors='#94A3B8')
for spine in ax.spines.values(): spine.set_edgecolor('#334155')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, '2_age_distribution_by_CAD.png'), dpi=150, bbox_inches='tight',
            facecolor='#0F172A')
plt.close()
print("[OK] 2_age_distribution_by_CAD.png")

# ─── 3. Numeric Feature Correlation Heatmap ───────────────────────────────────
numeric_data = df[numeric_cols + ['Cath']].copy()
corr = numeric_data.corr()

fig, ax = plt.subplots(figsize=(14, 12))
fig.patch.set_facecolor('#0F172A')
mask = np.triu(np.ones_like(corr, dtype=bool))
cmap = sns.diverging_palette(220, 10, as_cmap=True)
sns.heatmap(corr, mask=mask, cmap=cmap, vmax=0.8, vmin=-0.8, center=0,
            square=True, linewidths=0.3, ax=ax, cbar_kws={"shrink": 0.6},
            annot=False)
ax.set_facecolor('#1E293B')
ax.tick_params(colors='#94A3B8', labelsize=7)
ax.set_title('Numeric Feature Correlation Matrix', color='white', fontsize=13, fontweight='bold', pad=15)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, '3_correlation_heatmap.png'), dpi=150, bbox_inches='tight',
            facecolor='#0F172A')
plt.close()
print("[OK] 3_correlation_heatmap.png")

# ─── 4. Top Correlated Features with CAD ──────────────────────────────────────
cad_corr = numeric_data.corr()['Cath'].drop('Cath').sort_values()

fig, ax = plt.subplots(figsize=(10, 8))
fig.patch.set_facecolor('#0F172A')
ax.set_facecolor('#1E293B')
colors = ['#F87171' if v > 0 else '#34D399' for v in cad_corr.values]
bars = ax.barh(cad_corr.index, cad_corr.values, color=colors, edgecolor='white', linewidth=0.3)
ax.axvline(0, color='#64748B', linewidth=1)
ax.set_xlabel('Pearson Correlation with CAD', color='#94A3B8')
ax.set_title('Feature Correlations with CAD Status\n(Red = positive, Green = negative)',
             color='white', fontsize=12, fontweight='bold')
ax.tick_params(colors='#94A3B8', labelsize=8)
for spine in ax.spines.values(): spine.set_edgecolor('#334155')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, '4_cad_correlations.png'), dpi=150, bbox_inches='tight',
            facecolor='#0F172A')
plt.close()
print("[OK] 4_cad_correlations.png")

# ─── 5. Missing Value Analysis ─────────────────────────────────────────────────
missing = df_features.isnull().sum()
missing = missing[missing > 0].sort_values(ascending=False)

if len(missing) > 0:
    fig, ax = plt.subplots(figsize=(10, max(4, len(missing) * 0.4)))
    fig.patch.set_facecolor('#0F172A')
    ax.set_facecolor('#1E293B')
    pct = missing / len(df) * 100
    ax.barh(missing.index, pct.values, color='#F59E0B', edgecolor='white', linewidth=0.3)
    ax.set_xlabel('Missing Values (%)', color='#94A3B8')
    ax.set_title('Missing Value Analysis', color='white', fontsize=13, fontweight='bold')
    ax.tick_params(colors='#94A3B8', labelsize=8)
    for spine in ax.spines.values(): spine.set_edgecolor('#334155')
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '5_missing_values.png'), dpi=150, bbox_inches='tight',
                facecolor='#0F172A')
    plt.close()
    print("[OK] 5_missing_values.png")
else:
    print("[OK] No missing values found -- skipping plot")

# ─── 6. Vessel Co-occurrence Matrix (LAD+LCX+RCA) ─────────────────────────────
vessel_targets = df[['LAD', 'LCX', 'RCA']]
co_occur = pd.crosstab(vessel_targets.apply(lambda r: str(tuple(r)), axis=1),
                        columns='count')

fig, axes = plt.subplots(1, 3, figsize=(14, 4))
fig.patch.set_facecolor('#0F172A')
for ax, (v1, v2) in zip(axes, [('LAD', 'LCX'), ('LAD', 'RCA'), ('LCX', 'RCA')]):
    cross = pd.crosstab(df[v1], df[v2], rownames=[v1], colnames=[v2])
    sns.heatmap(cross, annot=True, fmt='d', cmap='YlOrRd', ax=ax, cbar=False,
                linewidths=0.5, linecolor='#0F172A')
    ax.set_title(f'{v1} × {v2} Co-occurrence', color='white', fontsize=11, pad=8)
    ax.set_facecolor('#1E293B')
    ax.tick_params(colors='#94A3B8')

fig.suptitle('Vessel Stenosis Co-occurrence Matrix', color='white', fontsize=13, fontweight='bold', y=1.05)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, '6_vessel_cooccurrence.png'), dpi=150, bbox_inches='tight',
            facecolor='#0F172A')
plt.close()
print("[OK] 6_vessel_cooccurrence.png")

# ─── 7. Key Clinical Features by CAD ──────────────────────────────────────────
key_features = ['Age', 'BP', 'BMI', 'FBS', 'LDL', 'EF-TTE', 'TG', 'HDL']
key_features = [f for f in key_features if f in df.columns]

fig, axes = plt.subplots(2, 4, figsize=(18, 8))
fig.patch.set_facecolor('#0F172A')
axes = axes.flatten()

for i, feat in enumerate(key_features[:8]):
    ax = axes[i]
    ax.set_facecolor('#1E293B')
    data_neg = df[df['Cath'] == 0][feat].dropna()
    data_pos = df[df['Cath'] == 1][feat].dropna()
    ax.violinplot([data_neg, data_pos], positions=[0, 1], showmedians=True)
    ax.set_xticks([0, 1])
    ax.set_xticklabels(['CAD-', 'CAD+'], color='#94A3B8')
    ax.set_title(feat, color='white', fontsize=10, fontweight='bold')
    ax.tick_params(colors='#94A3B8', labelsize=8)
    for spine in ax.spines.values(): spine.set_edgecolor('#334155')

    # Significance test
    _, p = stats.mannwhitneyu(data_neg, data_pos, alternative='two-sided')
    sig = '***' if p < 0.001 else '**' if p < 0.01 else '*' if p < 0.05 else 'ns'
    ax.set_xlabel(f'p={p:.3f} {sig}', color='#64748B', fontsize=8)

for j in range(len(key_features), len(axes)):
    axes[j].set_visible(False)

fig.suptitle('Key Clinical Features: CAD- vs CAD+ (Mann-Whitney U Test)',
             color='white', fontsize=13, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, '7_clinical_features_violin.png'), dpi=150, bbox_inches='tight',
            facecolor='#0F172A')
plt.close()
print("[OK] 7_clinical_features_violin.png")

print(f"\n[OK] EDA complete. All outputs saved to: {OUTPUT_DIR}/")
print("\n[*] Summary Statistics:")
print(df[numeric_cols[:10]].describe().round(2).to_string())
