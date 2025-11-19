# analytics-service/invoice_service.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import camelot
import traceback

app = Flask(__name__)
CORS(app)

def parse_pdf_with_camelot(path):
    # Try lattice first (works with ruled tables), then stream
    tables = []
    try:
        tables = camelot.read_pdf(path, flavor='lattice', pages='all', strip_text='\n')
        if len(tables) == 0:
            tables = camelot.read_pdf(path, flavor='stream', pages='all', strip_text='\n')
    except Exception as e:
        # return empty and let caller fallback or return error
        print("Camelot parse error:", e)
        tables = []

    rows = []
    for t in tables:
        df = t.df  # pandas DataFrame
        # assume first row is header
        if df.shape[0] < 2:
            continue
        headers = [str(h).strip().lower() for h in df.iloc[0].tolist()]
        for i in range(1, df.shape[0]):
            row = df.iloc[i].tolist()
            # heuristic mapping
            # find likely columns (description, batch, expiry, qty, price)
            row_obj = {
                'raw': [str(c).strip() for c in row],
                'description': None,
                'batch': None,
                'expiry': None,
                'quantity': None,
                'price': None,
            }
            for col_idx, cell in enumerate(row):
                h = headers[col_idx] if col_idx < len(headers) else ''
                cell_text = str(cell).strip()
                if 'description' in h or 'item' in h or 'product' in h or 'medicine' in h:
                    row_obj['description'] = cell_text
                elif 'batch' in h or 'batch no' in h or 'batch#' in h:
                    row_obj['batch'] = cell_text
                elif 'exp' in h or 'expiry' in h or 'e/d' in h:
                    row_obj['expiry'] = cell_text
                elif 'qty' in h or 'quantity' in h:
                    row_obj['quantity'] = cell_text
                elif 'price' in h or 'rate' in h or 'amount' in h:
                    row_obj['price'] = cell_text
            # fallback attempts: if any keys missing, attempt to find by regex in the full row
            # ensure description not null
            if not row_obj['description']:
                # try the longest text cell as description
                longest = max([str(c).strip() for c in row], key=len)
                row_obj['description'] = longest
            rows.append(row_obj)
    return rows

@app.route('/api/invoice/parse', methods=['POST'])
def parse_invoice():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        f = request.files['file']
        if f.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # save temporarily
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        f.save(tmp.name)
        tmp.flush()
        tmp.close()

        rows = parse_pdf_with_camelot(tmp.name)

        # cleanup
        try:
            os.unlink(tmp.name)
        except:
            pass

        return jsonify({'rows': rows})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# --- ADD BELOW INTO analytics-service/invoice_service.py ---

from flask import request, jsonify

# Simple mock demand predictor
@app.route('/api/predict/demand', methods=['POST'])
def mock_predict_demand():
    """
    Expects JSON: { "month": "YYYY-MM" } or { "month": <number> }.
    Returns a small set of mock predictions for demo.
    """
    try:
        data = request.get_json() or {}
        month = data.get('month')

        # Accept month as "YYYY-MM" or number. Derive an int month for variety.
        mnum = 1
        if isinstance(month, str):
            parts = month.split('-')
            if len(parts) > 1 and parts[1].isdigit():
                mnum = int(parts[1])
            else:
                # try parse as simple int string
                try:
                    mnum = int(month)
                except:
                    mnum = 1
        elif isinstance(month, (int, float)):
            mnum = int(month)

        # deterministic mock numbers (so results are stable for same input)
        base = 100
        predictions = [
            {"medicine": "Paracetamol 500mg Tablets", "predicted_demand": base + mnum * 4},
            {"medicine": "Amoxicillin 250mg Capsules", "predicted_demand": MathSafe(base//2 + mnum * 3)},
            {"medicine": "Ibuprofen 400mg Tablets", "predicted_demand": MathSafe(base//3 + mnum * 2)},
            {"medicine": "Cough Syrup 100ml", "predicted_demand": MathSafe(base//4 + mnum * 1)}
        ]
        return jsonify({"month": month, "predictions": predictions, "note": "mock analytics"}), 200
    except Exception as e:
        return jsonify({"error": "failed", "details": str(e)}), 500

# Simple mock risk predictor
@app.route('/api/predict/risk', methods=['POST'])
def mock_predict_risk():
    """
    Expects patient JSON; returns a simple mock risk score.
    Example input: { "age": 65, "comorbidities": ["diabetes","hypertension"], "isSmoker": true }
    """
    try:
        data = request.get_json() or {}
        age = data.get('age', 40)
        comorbidities = data.get('comorbidities', [])
        is_smoker = data.get('isSmoker', False)

        # Tiny scoring heuristic
        score = 0.1
        score += max(0, (age - 30)) * 0.005   # small bump per year beyond 30
        score += min(0.5, 0.15 * len(comorbidities))
        if is_smoker:
            score += 0.1
        score = min(0.99, round(score, 2))
        return jsonify({"risk_score": score, "explanation": "mock rule-based score"}), 200
    except Exception as e:
        return jsonify({"error": "failed", "details": str(e)}), 500

# helper
def MathSafe(v):
    try:
        return int(v)
    except:
        try:
            return round(float(v), 2)
        except:
            return v

# --- END ADDITION ---

if __name__ == '__main__':
    app.run(port=5001, debug=True)