Hello! 👋

TaskMaster - A task management system

A simple Kanban board application for managing tasks and projects with a drag-and-drop functionality and calendar view

⚙️ Features
- Dashboard: Drag and drop between columns (To Do, In Progress, In Review, Done)
- Calendar View: Visualize tasks by due date with a monthly calendar layout
- Ticket Management: Create, edit, and delete tickets
- Filter and Search: Be able to search for a ticket by title and Filter by tag type or priority
- Statistics: Real-time metrics including total tickets, completion rate, and high priority items
- Progress Tracking: Progress is displayed with a visual progress bar
- Persistent Storage: Data is saved locally in your browser using localStorage

✨ Customizable: Double-click to rename project

👩‍💻 Tech Stack:
- HTML5
- CSS3
- JavaScript
- Google Fonts

📝 Ticket Fields:
Each ticket has a...
- Title: Task name
- Column: Status (To Do, In Progress, In Review, Done)
- Tag: Type ( Feature, Bug, Design, Docs, Performance)
- Priority: In levels (Low, Medium, High)
- Assignee: Team Member Assigned
- Due Date: Deadline of Task
- Description: Additional details on the task (optional)

🏃 How to Run Locally

Option 1: Direct File Opening (Simplest)

1. Download the files
   - Create a new folder on your computer
   - Save the HTML file as `index.html`
   - The CSS and JavaScript are embedded within the HTML file

2. Open in browser
   - Double-click the `index.html` file
   - It will open in your default web browser
   - No server or internet connection required (except for Google Fonts)

Option 2: Using a Local Development Server

If you want to use a local server (recommended for development):

Using Python:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
