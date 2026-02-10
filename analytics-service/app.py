# analytics-service/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import traceback
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import make_pipeline
from sklearn.compose import ColumnTransformer
import csv
from datetime import datetime
import shutil

# Attempt to import invoice_service (may be a module with Blueprint / register function / handler)
try:
    import invoice_service
    invoice_import_error = None
except Exception as e:
    invoice_service = None
    invoice_import_error = e

app = Flask(__name__)
CORS(app)

# -------------------------
# Helper utilities (you already had parse_month_to_index etc.)
# -------------------------
def parse_month_to_index(month_input, months_index_map):
    if month_input is None:
        return None
    try:
        if isinstance(month_input, int):
            last_month = max(months_index_map.keys()) if months_index_map else None
            if not last_month:
                return None
            y = int(last_month.split('-')[0])
            m = int(month_input)
            key = f"{y:04d}-{m:02d}"
            if key in months_index_map:
                return months_index_map[key]
            alt_key = f"{y+1:04d}-{m:02d}"
            if alt_key in months_index_map:
                return months_index_map[alt_key]
        if isinstance(month_input, str) and month_input.isdigit():
            return parse_month_to_index(int(month_input), months_index_map)
    except Exception:
        pass
    if isinstance(month_input, str):
        s = month_input.strip()
        if len(s) == 7 and s[4] == '-':
            if s in months_index_map:
                return months_index_map[s]
            mm = s[5:7]
            candidates = [k for k in months_index_map if k.endswith(f"-{mm}")]
            if candidates:
                candidates.sort()
                return months_index_map[candidates[-1]]
    return None

def month_index_to_label(idx, months_list):
    if idx is None or idx < 0 or idx >= len(months_list):
        return None
    return months_list[idx]

# -------------------------
# Paths / CSV locations
# -------------------------
DATA_DIR = os.path.dirname(__file__) or '.'
demand_csv = os.path.join(DATA_DIR, "synthetic_medicine_demand.csv")
risk_csv = os.path.join(DATA_DIR, "synthetic_patient_risk.csv")
disease_csv = os.path.join(DATA_DIR, "synthetic_disease_trends.csv")

# Event files directory (new)
EVENT_DATA_DIR = os.path.join(DATA_DIR, "data")
os.makedirs(EVENT_DATA_DIR, exist_ok=True)
DEMAND_EVENTS_CSV = os.path.join(EVENT_DATA_DIR, "synthetic_medicine_demand_events.csv")
ADMISSIONS_EVENTS_CSV = os.path.join(EVENT_DATA_DIR, "admissions_events.csv")

# Simple containers
demand_models = {}
disease_models = {}
months_list = []
months_index_map = {}
medicine_catalog = []
disease_catalog = []

risk_pipeline = None

# -------------------------
# Training logic (same as you had)
# -------------------------
def train_models():
    global demand_models, disease_models, months_list, months_index_map, medicine_catalog, disease_catalog, risk_pipeline

    # demand
    demand_models = {}
    if os.path.exists(demand_csv):
        df = pd.read_csv(demand_csv)
        df['month'] = df['month'].astype(str)
        months_list = sorted(df['month'].unique())
        months_index_map = {m: i for i, m in enumerate(months_list)}
        medicine_catalog = sorted(df['medicine'].unique())
        for med in medicine_catalog:
            mdf = df[df['medicine'] == med].copy()
            X = mdf['month'].map(months_index_map).values.reshape(-1, 1)
            y = mdf['demand'].values
            if len(X) >= 3:
                model = RandomForestRegressor(n_estimators=50, random_state=42)
                model.fit(X, y)
                demand_models[med] = model
            else:
                demand_models[med] = None
    else:
        months_list = [f"2025-{m:02d}" for m in range(1, 13)]
        months_index_map = {m: i for i, m in enumerate(months_list)}
        medicine_catalog = ["Paracetamol 500mg Tablets", "Amoxicillin 250mg Capsules"]
        for med in medicine_catalog:
            demand_models[med] = None

    # disease
    disease_models = {}
    if os.path.exists(disease_csv):
        ddf = pd.read_csv(disease_csv)
        ddf['month'] = ddf['month'].astype(str)
        disease_catalog = sorted(ddf['disease'].unique())
        for dis in disease_catalog:
            sdf = ddf[ddf['disease'] == dis].copy()
            X = sdf['month'].map(months_index_map).values.reshape(-1, 1)
            y = sdf['cases'].values
            if len(X) >= 3:
                model = RandomForestRegressor(n_estimators=40, random_state=42)
                model.fit(X, y)
                disease_models[dis] = model
            else:
                disease_models[dis] = None
    else:
        disease_catalog = ["Influenza", "Dengue"]
        for dis in disease_catalog:
            disease_models[dis] = None

    # patient risk
    if os.path.exists(risk_csv):
        rdf = pd.read_csv(risk_csv)
        def make_features(df):
            X = pd.DataFrame()
            X['age'] = df['age'].fillna(50).astype(float)
            X['isSmoker'] = df['isSmoker'].astype(bool).astype(int)
            X['hr'] = df['hr'].fillna(75).astype(float)
            def bp_flag(bp):
                try:
                    s = str(bp)
                    s_sys = int(s.split('/')[0])
                    s_dia = int(s.split('/')[1])
                    return 1 if (s_sys > 140 or s_dia > 90) else 0
                except:
                    return 0
            X['high_bp'] = df['bp'].apply(bp_flag)
            X['condition'] = df['condition'].fillna('None').astype(str)
            return X

        X = make_features(rdf)
        y = rdf['readmitted'].astype(int).values
        categorical_features = ['condition']
        preprocessor = ColumnTransformer(transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ], remainder='passthrough')
        clf = LogisticRegression(max_iter=1000)
        risk_pipeline = make_pipeline(preprocessor, clf)
        try:
            risk_pipeline.fit(X, y)
        except Exception as e:
            print("Warning: risk model training failed:", e)
            risk_pipeline = None
    else:
        risk_pipeline = None

# initial train
train_models()
print("Analytics service: models trained/loaded.")
print("Medicines:", medicine_catalog)
print("Diseases:", disease_catalog)
print("Months:", len(months_list))

# -------------------------
# Try to register invoice_service routes if available
# -------------------------
def register_invoice_routes_if_possible(app):
    if invoice_service is None:
        print("[analytics] invoice_service not imported:", getattr(invoice_import_error, 'args', invoice_import_error))
        print("[analytics] To enable invoice parsing endpoints, ensure analytics-service/invoice_service.py exists and exports a blueprint or a register function.")
        return

    # 1) If invoice_service has a Blueprint object under common names, register it
    blueprint_names = ('invoice_bp', 'invoice_blueprint', 'bp', 'blueprint')
    for name in blueprint_names:
        if hasattr(invoice_service, name):
            bp = getattr(invoice_service, name)
            try:
                app.register_blueprint(bp)
                print(f"[analytics] Registered invoice blueprint from invoice_service ({name}).")
                return
            except Exception as e:
                print(f"[analytics] Failed to register blueprint '{name}':", e)

    # 2) If invoice_service exposes a register function, call it
    register_funcs = ('register_routes', 'register_invoice_routes', 'init_routes')
    for fn in register_funcs:
        if hasattr(invoice_service, fn) and callable(getattr(invoice_service, fn)):
            try:
                getattr(invoice_service, fn)(app)
                print(f"[analytics] Called invoice_service.{fn}(app) to register invoice routes.")
                return
            except Exception as e:
                print(f"[analytics] invoice_service.{fn} raised an exception:", e)

    # 3) If invoice_service exposes a parse handler function, wrap it
    if hasattr(invoice_service, 'parse_invoice') and callable(invoice_service.parse_invoice):
        try:
            @app.route('/api/invoice/parse', methods=['POST'])
            def _invoice_parse_wrapper():
                # The invoice_service.parse_invoice may expect flask.request inside its module.
                # Try to call it and return its result.
                try:
                    return invoice_service.parse_invoice()
                except Exception as ie:
                    traceback.print_exc()
                    return jsonify({'error': 'invoice_service.parse_invoice failed', 'detail': str(ie)}), 500
            print("[analytics] Exposed invoice_service.parse_invoice via /api/invoice/parse wrapper.")
            return
        except Exception as e:
            print("[analytics] Failed to wrap parse_invoice:", e)

    # 4) Not found — warn developer
    print("[analytics] invoice_service imported but no usable registration found.")
    print("[analytics] Expected one of:")
    print("  - a Blueprint named invoice_bp / invoice_blueprint / bp / blueprint (preferred).")
    print("  - a function register_routes(app) or register_invoice_routes(app) or init_routes(app).")
    print("  - a callable parse_invoice() that handles the request (fallback wrapper created if present).")
    print("[analytics] Please update analytics-service/invoice_service.py to export one of the above so app.py can register invoice endpoints automatically.")

# attempt registration now
register_invoice_routes_if_possible(app)

# -------------------------
# Existing predict endpoints (unchanged)
# -------------------------
@app.route('/api/predict/demand', methods=['POST'])
def predict_demand():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        month = payload.get('month')
        idx = parse_month_to_index(month, months_index_map)
        if idx is None:
            return jsonify({'error': 'Invalid or out-of-range month', 'available_months': months_list}), 400

        results = []
        for med in medicine_catalog:
            model = demand_models.get(med)
            if model:
                pred = model.predict(np.array([[idx]]))[0]
                pred = float(max(0, round(pred)))
            else:
                pred = None
                try:
                    df = pd.read_csv(demand_csv)
                    pred = int(df[df['medicine'] == med]['demand'].mean())
                except Exception:
                    pred = 50
            results.append({'medicine': med, 'predicted_demand': pred})
        return jsonify({'month': month, 'predictions': results})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/disease', methods=['POST'])
def predict_disease_trends():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        month = payload.get('month')
        idx = parse_month_to_index(month, months_index_map)
        if idx is None:
            return jsonify({'error': 'Invalid or out-of-range month', 'available_months': months_list}), 400

        results = []
        for dis in disease_catalog:
            model = disease_models.get(dis)
            if model:
                pred = model.predict(np.array([[idx]]))[0]
                pred = float(max(0, round(pred)))
            else:
                pred = 20
            results.append({'disease': dis, 'predicted_cases': pred})
        return jsonify({'month': month, 'predictions': results})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/risk', methods=['POST'])
def predict_risk():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        df_in = pd.DataFrame([{
            'age': float(payload.get('age', 50)),
            'isSmoker': bool(payload.get('isSmoker', False)),
            'hr': float(payload.get('hr', 75)),
            'bp': payload.get('bp', '120/80'),
            'condition': payload.get('condition', 'None')
        }])
        def bp_flag(bp):
            try:
                s = str(bp)
                s_sys = int(s.split('/')[0])
                s_dia = int(s.split('/')[1])
                return 1 if (s_sys > 140 or s_dia > 90) else 0
            except:
                return 0
        X = pd.DataFrame()
        X['age'] = df_in['age']
        X['isSmoker'] = df_in['isSmoker'].astype(int)
        X['hr'] = df_in['hr']
        X['high_bp'] = df_in['bp'].apply(bp_flag)
        X['condition'] = df_in['condition']

        if risk_pipeline:
            prob = float(risk_pipeline.predict_proba(X)[0][1])
            pred = int(prob > 0.5)
            return jsonify({'explanation': 'logistic risk probability (trained on synthetic data)', 'risk_score': prob, 'risk_flag': pred})
        else:
            score = 0.0
            score += X['age'].iloc[0] / 100.0
            score += 0.8 if X['isSmoker'].iloc[0] else 0.0
            score += 1.2 if X['high_bp'].iloc[0] else 0.0
            score += 1.5 if X['condition'].iloc[0] != 'None' else 0.0
            prob = min(0.99, score / 6.0)
            return jsonify({'explanation': 'rule based fallback', 'risk_score': float(prob), 'risk_flag': int(prob > 0.5)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/metadata', methods=['GET'])
def analytics_metadata():
    return jsonify({
        'medicines': medicine_catalog,
        'diseases': disease_catalog,
        'months': months_list
    })

# -------------------------
# New: event ingestion endpoints (you already added earlier)
# -------------------------
@app.route('/api/analytics/update', methods=['POST'])
def analytics_update():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        ptype = payload.get('type')

        if ptype == 'demand_batch':
            events = payload.get('events', [])
            written = 0
            for ev in events:
                row = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'month': ev.get('month') or '',
                    'medicine': ev.get('medicine') or '',
                    'quantity': ev.get('quantity') or 0,
                    'invoiceId': ev.get('invoiceId') or ''
                }
                headers = ['timestamp', 'month', 'medicine', 'quantity', 'invoiceId']
                write_header = not os.path.exists(DEMAND_EVENTS_CSV)
                with open(DEMAND_EVENTS_CSV, 'a', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=headers)
                    if write_header:
                        writer.writeheader()
                    writer.writerow(row)
                written += 1
            return jsonify({'status': 'ok', 'written': written}), 200

        if ptype == 'admission':
            row = {
                'timestamp': datetime.utcnow().isoformat(),
                'admittedAt': payload.get('admittedAt') or '',
                'patientName': payload.get('patientName') or '',
                'age': payload.get('age') or '',
                'gender': payload.get('gender') or '',
                'roomType': payload.get('roomType') or '',
                'doctor': payload.get('doctor') or '',
                'admissionId': payload.get('admissionId') or ''
            }
            headers = ['timestamp','admittedAt','patientName','age','gender','roomType','doctor','admissionId']
            write_header = not os.path.exists(ADMISSIONS_EVENTS_CSV)
            with open(ADMISSIONS_EVENTS_CSV, 'a', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                if write_header:
                    writer.writeheader()
                writer.writerow(row)
            return jsonify({'status': 'ok'}), 200

        raw_path = os.path.join(EVENT_DATA_DIR, 'raw_events.log')
        with open(raw_path, 'a', encoding='utf-8') as f:
            f.write(f"{datetime.utcnow().isoformat()} {payload}\n")
        return jsonify({'status': 'ok', 'note': 'stored raw'}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# -------------------------
# New: merge events and retrain
# -------------------------
@app.route('/api/analytics/merge_and_retrain', methods=['POST'])
def analytics_merge_and_retrain():
    """
    Merge demand events into the main demand CSV, archive events file, then retrain models.
    """
    try:
        merged = 0
        # If demand events exists, append them to main demand_csv in required format:
        # expected columns in demand_csv: month,medicine,demand (or similar)
        if os.path.exists(DEMAND_EVENTS_CSV):
            # read events
            ev_df = pd.read_csv(DEMAND_EVENTS_CSV)
            # group by month & medicine to sum quantities
            agg = ev_df.groupby(['month','medicine'], as_index=False)['quantity'].sum()
            # ensure demand_csv exists: if not, create with header
            if os.path.exists(demand_csv):
                base_df = pd.read_csv(demand_csv)
                # append aggregated rows (rename quantity -> demand)
                agg2 = agg.rename(columns={'quantity':'demand'})
                agg2 = agg2[['month','medicine','demand']]
                combined = pd.concat([base_df, agg2], ignore_index=True, sort=False)
                combined.to_csv(demand_csv, index=False)
            else:
                # produce a minimal demand_csv with header month,medicine,demand
                agg2 = agg.rename(columns={'quantity':'demand'})
                agg2 = agg2[['month','medicine','demand']]
                agg2.to_csv(demand_csv, index=False)
            merged = len(agg)
            # archive events file
            archive = DEMAND_EVENTS_CSV + f".processed.{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            shutil.move(DEMAND_EVENTS_CSV, archive)
        # TODO: you can similarly merge admissions/events into other CSVs if desired

        # Retrain models from current CSVs
        train_models()

        return jsonify({
            'status': 'ok',
            'merged_demand_groups': merged,
            'medicines': medicine_catalog,
            'months_count': len(months_list)
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)