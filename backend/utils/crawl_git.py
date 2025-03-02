import os
import subprocess


def get_git_root(start_path=None):
    """Finds the root directory of a Git project by searching for the .git folder."""
    if start_path is None:
        start_path = "/"  # Start from system root
    else:
        # Expand user directory (~/...)
        start_path = os.path.expanduser(start_path)
        # Get absolute path
        start_path = os.path.abspath(start_path)

    current_path = start_path

    while current_path != os.path.dirname(current_path):  # Stop at filesystem root
        if os.path.isdir(os.path.join(current_path, ".git")):
            return current_path
        current_path = os.path.dirname(current_path)  # Move one level up

    raise FileNotFoundError("No .git directory found, are you inside a Git project?")


def is_ignored_by_git(path: str):
    """Checks if a file or directory is ignored by Git using `git check-ignore`."""
    try:
        result = subprocess.run(
            ["git", "check-ignore", "-q", path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return result.returncode == 0  # Return True if ignored
    except FileNotFoundError:
        return False  # Git is not available, so assume not ignored


def crawl_directory(root_dir):
    """Recursively crawls all files and directories from root_dir,
    excluding hidden directories and respecting .gitignore."""
    file_list = []

    for root, dirs, files in os.walk(root_dir):
        # Remove hidden and ignored directories from traversal
        dirs[:] = [
            d
            for d in dirs
            if not d.startswith(".")
            and not d.startswith("__")
            and not is_ignored_by_git(os.path.join(root, d))
        ]

        for file in files:
            if not file.startswith("."):  # Exclude hidden files
                file_path = os.path.join(root, file)
                if not is_ignored_by_git(file_path):
                    file_list.append(file_path)

    return file_list


def crawl_git_project(start_path=None):
    """Crawls all files and directories from the root of the GitHub project, respecting .gitignore."""
    git_root = get_git_root(start_path)  # Get the Git project root
    print(git_root)
    return crawl_directory(git_root)  # Use your crawling function

def get_context_files(start_path=None):
    """Gets the contents of high context files like README.md that provide project context."""
    git_root = get_git_root(start_path)
    context = {}
    
    for file in os.listdir(git_root):
        if file.startswith("CONTEXT_") and file.endswith(".md"):
            file_path = os.path.join(git_root, file)
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    context[file] = f.read()
                
    return context
