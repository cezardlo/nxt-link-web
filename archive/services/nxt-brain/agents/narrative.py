from agents.base import BaseAgent

class Narrative(BaseAgent):
    def __init__(self):
        super().__init__()

    def generate_answer(self, data):
        """
        Generate a plain English answer from complex data.
        
        Args:
            data: The complex data to be simplified.
        
        Returns:
            str: A plain English representation of the data.
        """
        # Implement logic to format and present information clearly
        return self.format_data(data)

    def format_data(self, data):
        """
        Format the data into a readable plain English format.
        
        Args:
            data: The complex data to be formatted.
        
        Returns:
            str: A formatted plain English representation of the data.
        """
        # Placeholder for formatting logic
        return str(data)  # Convert data to string as a simple example