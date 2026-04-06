from data import supabase as db

class IKER:
    def __init__(self):
        self.vendors = self.load_vendors()

    def load_vendors(self):
        # Load active vendors from the database
        return db.select("vendors", {"status": ["active", "approved"]})

    def calculate_score(self, vendor):
        # Implement scoring logic for a vendor
        score = 0
        # Example scoring criteria
        if vendor['status'] == 'active':
            score += 50
        if vendor['ik_score'] > 70:
            score += 30
        if vendor['reputation'] == 'high':
            score += 20
        return score

    def score_vendors(self):
        # Score all vendors and update their scores in the database
        for vendor in self.vendors:
            score = self.calculate_score(vendor)
            db.update("vendors", vendor['company_name'], {"ik_score": score})

    def run_scoring(self):
        # Run the vendor scoring process
        self.score_vendors()
        return "Vendor scoring completed."