"""
GRC Co-Pilot RAG engine: a lightweight TF-IDF retrieval scorer over uploaded
bank policies plus a built-in NDPA 2023 / CBN Risk-Based Cybersecurity
Framework clause corpus. Given a natural-language audit query, it returns the
top matching regulatory/policy clauses ranked by cosine similarity.
"""
import os
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with",
    "is", "are", "be", "shall", "that", "this", "by", "at", "as", "it",
    "from", "we", "do", "does", "what", "how", "when", "should", "must",
    "i", "you", "our", "their", "any", "all",
}


def compute_highlight_terms(question: str, clause_text: str) -> list:
    """Returns significant words shared between the query and a clause,
    used by the frontend to green-highlight the exact matching evidence."""
    question_words = {w for w in re.findall(r"[a-z]+", question.lower()) if w not in STOPWORDS and len(w) > 2}
    clause_words = re.findall(r"[A-Za-z]+", clause_text)
    seen = set()
    matches = []
    for word in clause_words:
        lowered = word.lower()
        if lowered in question_words and lowered not in seen:
            seen.add(lowered)
            matches.append(word)
    return matches

# Baseline regulatory clause corpus shipped with the engine. Uploaded policy
# documents are appended to this corpus at query time.
BASELINE_CLAUSES = [
    {
        "source": "NDPA 2023",
        "clause": "Section 14(b)",
        "text": "A data controller or data processor shall retain personal data only for the period necessary to "
                "achieve the purpose for which it was collected, unless a longer retention period is required by law.",
        "framework": "ndpa",
    },
    {
        "source": "NDPA 2023",
        "clause": "Section 24",
        "text": "A data controller shall implement appropriate technical and organizational measures to ensure a "
                "level of security appropriate to the risk, including encryption and pseudonymization of personal data.",
        "framework": "ndpa",
    },
    {
        "source": "NDPA 2023",
        "clause": "Section 32",
        "text": "In the event of a personal data breach, the data controller shall notify the Commission within 72 hours "
                "of becoming aware of the breach, where feasible.",
        "framework": "ndpa",
    },
    {
        "source": "NDPA 2023",
        "clause": "Section 28",
        "text": "Personal data shall not be transferred outside Nigeria unless the recipient country ensures an "
                "adequate level of data protection or appropriate safeguards are in place.",
        "framework": "ndpa",
    },
    {
        "source": "CBN Risk-Based Cybersecurity Framework",
        "clause": "Section 3.1",
        "text": "Financial institutions shall establish a board-approved cybersecurity policy reviewed at least "
                "annually, with clear ownership of cybersecurity risk at executive level.",
        "framework": "cbn",
    },
    {
        "source": "CBN Risk-Based Cybersecurity Framework",
        "clause": "Section 4.2",
        "text": "Institutions shall conduct a cybersecurity risk assessment at least annually and maintain an "
                "inventory of critical information assets and their associated risk ratings.",
        "framework": "cbn",
    },
    {
        "source": "CBN Risk-Based Cybersecurity Framework",
        "clause": "Section 5.4",
        "text": "Institutions shall implement multi-factor authentication for all privileged and remote access "
                "to critical systems and maintain logs of all administrative activity for at least one year.",
        "framework": "cbn",
    },
    {
        "source": "CBN Risk-Based Cybersecurity Framework",
        "clause": "Section 6.1",
        "text": "Institutions shall report significant cyber incidents to the CBN within 24 hours of detection and "
                "submit a full incident report within 2 weeks of resolution.",
        "framework": "cbn",
    },
    {
        "source": "CBN Risk-Based Cybersecurity Framework",
        "clause": "Section 7.3",
        "text": "Institutions shall engage in third-party vendor risk assessments before onboarding any service "
                "provider with access to customer data or critical infrastructure.",
        "framework": "cbn",
    },
]


def extract_text_from_pdf(file_path: str) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        from PyPDF2 import PdfReader

    reader = PdfReader(file_path)
    pages_text = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages_text)


def extract_text_from_upload(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if ext == "pdf":
        return extract_text_from_pdf(file_path)
    if ext in ("txt",):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    if ext == "docx":
        import docx

        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    raise ValueError(f"Unsupported file extension: {ext}")


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list:
    words = text.split()
    if not words:
        return []
    chunks = []
    step = max(chunk_size - overlap, 1)
    for start in range(0, len(words), step):
        chunk_words = words[start:start + chunk_size]
        if chunk_words:
            chunks.append(" ".join(chunk_words))
        if start + chunk_size >= len(words):
            break
    return chunks


class GRCCoPilot:
    def __init__(self, uploaded_policies: list = None):
        self.uploaded_policies = uploaded_policies or []

    def register_uploaded_policy(self, filename: str, text: str, is_test_data: bool = False):
        for chunk in chunk_text(text):
            self.uploaded_policies.append({
                "source": filename,
                "clause": "Uploaded Policy",
                "text": chunk,
                "framework": "uploaded",
                "is_test_data": is_test_data,
            })

    def _corpus(self, framework: str = "all") -> list:
        corpus = BASELINE_CLAUSES + self.uploaded_policies
        if framework and framework != "all":
            corpus = [c for c in corpus if c["framework"] == framework or c["framework"] == "uploaded"]
        return corpus

    def detect_gaps(self, coverage_threshold: float = 0.12, include_test_data: bool = True) -> list:
        """
        For each baseline regulatory clause, checks whether any uploaded policy
        chunk substantively covers it (cosine similarity above threshold). Any
        baseline clause without adequate coverage is flagged as an AI-detected
        compliance gap for the GRC Management dashboard.

        `include_test_data=False` excludes fake/sample policies uploaded to
        exercise the scoreboard from a real compliance-gap calculation.
        """
        pool = self.uploaded_policies if include_test_data else [
            p for p in self.uploaded_policies if not p.get("is_test_data")
        ]
        if not pool:
            return [
                {
                    "source": clause["source"],
                    "clause": clause["clause"],
                    "text": clause["text"],
                    "framework": clause["framework"],
                    "best_coverage_score": 0.0,
                    "covered": False,
                }
                for clause in BASELINE_CLAUSES
            ]

        policy_texts = [p["text"] for p in pool]
        baseline_texts = [c["text"] for c in BASELINE_CLAUSES]
        vectorizer = TfidfVectorizer(lowercase=True, stop_words="english", ngram_range=(1, 2))
        matrix = vectorizer.fit_transform(baseline_texts + policy_texts)

        baseline_vectors = matrix[:len(baseline_texts)]
        policy_vectors = matrix[len(baseline_texts):]
        similarities = cosine_similarity(baseline_vectors, policy_vectors)

        gaps = []
        for clause, scores in zip(BASELINE_CLAUSES, similarities):
            best_score = round(float(scores.max()), 4) if len(scores) else 0.0
            gaps.append({
                "source": clause["source"],
                "clause": clause["clause"],
                "text": clause["text"],
                "framework": clause["framework"],
                "best_coverage_score": best_score,
                "covered": best_score >= coverage_threshold,
            })
        return gaps

    def compliance_score(self, coverage_threshold: float = 0.12) -> dict:
        """Rolls detect_gaps() up into a single compliance scoreboard score:
        percentage of baseline regulatory clauses adequately covered by the
        organisation's uploaded (non-test) policies."""
        gaps = self.detect_gaps(coverage_threshold=coverage_threshold, include_test_data=False)
        total = len(gaps)
        covered = sum(1 for g in gaps if g["covered"])
        uncovered = total - covered
        return {
            "score_pct": round((covered / total) * 100, 1) if total else 0.0,
            "covered": covered,
            "uncovered": uncovered,
            "total": total,
        }

    def query(self, question: str, framework: str = "all", top_k: int = 5) -> list:
        corpus = self._corpus(framework)
        if not question or not question.strip() or not corpus:
            return []

        documents = [c["text"] for c in corpus]
        vectorizer = TfidfVectorizer(lowercase=True, stop_words="english", ngram_range=(1, 2))
        doc_matrix = vectorizer.fit_transform(documents + [question])

        query_vector = doc_matrix[-1]
        doc_vectors = doc_matrix[:-1]
        similarities = cosine_similarity(query_vector, doc_vectors)[0]

        ranked = sorted(zip(corpus, similarities), key=lambda pair: pair[1], reverse=True)
        results = []
        for clause, score in ranked[:top_k]:
            if score <= 0:
                continue
            results.append({
                "source": clause["source"],
                "clause": clause["clause"],
                "text": clause["text"],
                "framework": clause["framework"],
                "relevance_score": round(float(score), 4),
                "highlight_terms": compute_highlight_terms(question, clause["text"]),
            })
        return results


_copilot_instance = None


def get_copilot() -> GRCCoPilot:
    global _copilot_instance
    if _copilot_instance is None:
        _copilot_instance = GRCCoPilot()
    return _copilot_instance
