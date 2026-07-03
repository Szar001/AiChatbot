"""
TicketClassifier: TF-IDF + Linear SVM pipeline that triages incoming ticket
text into Governance / Attack Security / Defence. Low-confidence predictions
are flagged for manual human review instead of being auto-routed.
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC

LABELS = ["Governance", "Attack Security", "Defence"]

# Seed training corpus. In production this would be replaced/augmented by
# historical resolved tickets pulled from the Life Document repository.
TRAINING_CORPUS = [
    ("Request for clarification on data retention policies under NDPA 2023 Section 14(b).", "Governance"),
    ("ISO 27001 gap assessment needed for Q2 compliance audit.", "Governance"),
    ("Need sign-off on the new vendor risk assessment policy document.", "Governance"),
    ("CBN risk-based cybersecurity framework review for board reporting.", "Governance"),
    ("Update the data protection impact assessment template for new product launch.", "Governance"),
    ("Annual compliance scoreboard review meeting with internal audit team.", "Governance"),
    ("Policy exception request for third-party access to customer database.", "Governance"),
    ("GDPR data subject access request received from customer, needs legal review.", "Governance"),
    ("Quarterly regulatory filing for NDPA compliance is due next week.", "Governance"),
    ("Board requires updated risk register aligned with CBN cybersecurity guidelines.", "Governance"),
    ("SQL injection attempt logged, WAF intercepted malicious payload targeting database.", "Attack Security"),
    ("Phishing email campaign detected targeting staff with credential harvesting links.", "Attack Security"),
    ("Suspicious login attempts from unknown IP address outside normal business hours.", "Attack Security"),
    ("Ransomware signature detected in email attachment, user opened suspicious .exe file.", "Attack Security"),
    ("Brute force attack detected against the VPN gateway authentication endpoint.", "Attack Security"),
    ("DDoS traffic spike observed against the public-facing online banking portal.", "Attack Security"),
    ("Unauthorized privilege escalation attempt detected on the core banking server.", "Attack Security"),
    ("Malware beaconing to external command and control server identified by SIEM.", "Attack Security"),
    ("Credential stuffing attack against customer login portal flagged by rate limiter.", "Attack Security"),
    ("Exploit attempt against known CVE in the public API gateway logged by IDS.", "Attack Security"),
    ("Firewall rule update needed to close exposed port on the DMZ segment.", "Defence"),
    ("Deploy critical security patch to fix vulnerability in the core banking application.", "Defence"),
    ("Endpoint detection and response alert triaged and contained on staff laptop.", "Defence"),
    ("Harden the SIEM platform configuration to reduce false positive alert volume.", "Defence"),
    ("Rotate compromised API keys and revoke exposed credentials immediately.", "Defence"),
    ("Implement multi-factor authentication for all remote administrative access.", "Defence"),
    ("Conduct vulnerability scan remediation on the internal file server cluster.", "Defence"),
    ("Update intrusion prevention system signatures after recent threat intel feed.", "Defence"),
    ("Network segmentation project to isolate POS terminals from corporate network.", "Defence"),
    ("Backup and disaster recovery test for the customer database infrastructure.", "Defence"),
]


class TicketClassifier:
    def __init__(self, confidence_threshold: float = 0.55):
        self.confidence_threshold = confidence_threshold
        self.vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2),
            min_df=1,
        )
        self.model = LinearSVC(C=1.0, class_weight="balanced")
        self._fit()

    def _fit(self):
        texts, labels = zip(*TRAINING_CORPUS)
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, labels)

    @staticmethod
    def _softmax(scores: np.ndarray) -> np.ndarray:
        shifted = scores - np.max(scores)
        exp_scores = np.exp(shifted)
        return exp_scores / exp_scores.sum()

    def classify(self, text: str) -> dict:
        if not text or not text.strip():
            return {
                "label": None,
                "confidence": 0.0,
                "needs_human_review": True,
                "reason": "Empty ticket text",
                "scores": {},
            }

        X = self.vectorizer.transform([text])
        decision_scores = self.model.decision_function(X)[0]
        probabilities = self._softmax(decision_scores)

        class_order = self.model.classes_
        score_map = {label: float(prob) for label, prob in zip(class_order, probabilities)}

        best_label = max(score_map, key=score_map.get)
        confidence = score_map[best_label]
        needs_review = confidence < self.confidence_threshold

        return {
            "label": best_label,
            "confidence": round(confidence, 4),
            "needs_human_review": needs_review,
            "reason": "Below confidence threshold" if needs_review else "Auto-routed",
            "scores": {k: round(v, 4) for k, v in score_map.items()},
        }


_classifier_instance = None


def get_classifier() -> TicketClassifier:
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = TicketClassifier()
    return _classifier_instance
