# Export service to convert billing config to JSON or CSV

import csv
import io
import json
from typing import Any

#Return a clean JSON export (values only)
def export_as_json(billing_config: dict[str, Any], contract_id: str) -> str:
    clean = {"contract_id": contract_id, "billing_configuration": {}}

    for field, data in billing_config.items():
        if isinstance(data, dict) and "value" in data:
            clean["billing_configuration"][field] = { 
                "value": data.get("value"), 
                "confidence": data.get("confidence"),
                }
            #Preserve extra fields
            for key in data:
                if key not in ("value", "confidence", "source_text"):
                    clean["billing_configuration"][field][key] = data[key]
        else:
            clean["billing_configuration"][field] = data

    return json.dumps(clean, indent=2, default=str)


#Return CSV with field, values and confidence columns
def export_as_csv(billing_config: dict[str, Any], contract_id: str) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["field", "value", "confidence", "source_text"])

    def flatten(prefix: str, data: Any):
        if isinstance(data, dict):
            if "value" in data or "confidence" in data:
                value = data.get("value")
                #Serialize nested values
                if isinstance(value, (list, dict)):
                    value = json.dumps(value)
                writer.writerow([
                    prefix,
                    value,
                    data.get("confidence", ""),
                    data.get("source_text", "")
                ])
            else:
                for key, val in data.items():
                    flatten(f"{prefix}.{key}", val)
        elif isinstance(data, list):
            writer.writerow([prefix, json.dumps(data), "", ""])
        else:
           writer.writerow([prefix, data, "", ""])

    for field, value in billing_config.items():
        flatten(field, value)

    return output.getvalue() 
