import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

np.random.seed(42)
random.seed(42)

# ----------- 1. Medicine Demand Data ------------
medicines = [
    "Paracetamol 500mg Tablets", "Amoxicillin 250mg Capsules", "Ibuprofen 400mg Tablets",
    "Cough Syrup 100ml", "Vitamin C 500mg Tablets", "Cetirizine 10mg Tablets",
    "Azithromycin 500mg Tablets", "Omeprazole 20mg Capsules", "Insulin Injection 10ml",
    "Metformin 500mg Tablets", "Amlodipine 5mg Tablets", "Losartan 50mg Tablets",
    "Atorvastatin 10mg Tablets", "Pantoprazole 40mg Tablets", "Cefixime 200mg Tablets",
    "Prednisolone 10mg Tablets", "Montelukast 10mg Tablets", "Diclofenac 50mg Tablets",
    "Clopidogrel 75mg Tablets", "Amoxiclav 625mg Tablets"
]

months = pd.date_range(start="2023-01-01", end="2025-10-01", freq="MS")

records = []
for med in medicines:
    base = random.randint(80, 200)
    for m in months:
        seasonal_factor = 1.0
        if m.month in [12, 1, 2]:  # winter
            seasonal_factor = random.uniform(1.2, 1.5)
        elif m.month in [6, 7, 8]:  # monsoon
            seasonal_factor = random.uniform(1.1, 1.3)
        noise = np.random.normal(0, 10)
        demand = max(10, int(base * seasonal_factor + noise))
        records.append([m.strftime("%Y-%m"), med, demand])

demand_df = pd.DataFrame(records, columns=["month", "medicine", "demand"])
demand_df.to_csv("synthetic_medicine_demand.csv", index=False)

print(f"✅ synthetic_medicine_demand.csv created ({len(demand_df)} rows)")


# ----------- 2. Patient Risk Data ------------
ages = np.random.randint(18, 90, 1000)
genders = np.random.choice(["Male", "Female"], 1000)
conditions = ["None", "Diabetes", "Hypertension", "Cardiac", "Asthma"]
smoker = np.random.choice([True, False], 1000, p=[0.3, 0.7])

rows = []
for i in range(1000):
    cond = np.random.choice(conditions, p=[0.25, 0.25, 0.25, 0.15, 0.10])
    hr = np.random.randint(60, 110)
    bp_sys = np.random.randint(100, 180)
    bp_dia = np.random.randint(60, 110)
    risk_score = (
        (ages[i] / 100) +
        (1 if cond != "None" else 0) * 1.5 +
        (1 if smoker[i] else 0.8) +
        ((bp_sys > 140 or bp_dia > 90) * 1.2)
    ) + np.random.normal(0, 0.5)
    readmit = 1 if risk_score > 2.8 else 0
    rows.append([ages[i], genders[i], cond, smoker[i], hr, f"{bp_sys}/{bp_dia}", risk_score, readmit])

risk_df = pd.DataFrame(rows, columns=["age", "gender", "condition", "isSmoker", "hr", "bp", "risk_score", "readmitted"])
risk_df.to_csv("synthetic_patient_risk.csv", index=False)

print(f"✅ synthetic_patient_risk.csv created ({len(risk_df)} rows)")


# ----------- 3. Seasonal Disease Trends ------------
diseases = ["Dengue", "Malaria", "Typhoid", "Influenza", "Chikungunya", "Pneumonia"]
trend_records = []

for dis in diseases:
    for m in months:
        base = random.randint(20, 100)
        if dis in ["Dengue", "Malaria"] and m.month in [6,7,8,9]:  # monsoon peak
            base *= random.uniform(2.0, 3.0)
        elif dis in ["Influenza", "Pneumonia"] and m.month in [12,1,2]:  # winter peak
            base *= random.uniform(1.5, 2.5)
        cases = int(base + np.random.normal(0, 10))
        trend_records.append([m.strftime("%Y-%m"), dis, max(0, cases)])

trend_df = pd.DataFrame(trend_records, columns=["month", "disease", "cases"])
trend_df.to_csv("synthetic_disease_trends.csv", index=False)

print(f"✅ synthetic_disease_trends.csv created ({len(trend_df)} rows)")