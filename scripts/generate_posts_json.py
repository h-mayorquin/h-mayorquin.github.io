import json
import os

# Assuming this script is run from the root of your project directory
posts_directory = "./posts"
posts_list = []

for filename in os.listdir(posts_directory):
    if filename.endswith(".html"):
        # Split the filename on hyphens
        parts = filename.split('-')
        # Extract the date part and rejoin it
        date_str = '-'.join(parts[:3])
        # Rejoin the title parts and replace hyphens with spaces, then remove the .html extension
        title_str = ' '.join(parts[3:]).replace('.html', '').title()
        
        # Construct the post path
        post_path = os.path.join(posts_directory, filename)
        
        # Append post info to the list
        posts_list.append({
            "title": title_str,
            "url": post_path,
            "date": date_str
        })

# Write the list to posts.json file
with open("posts.json", "w") as json_file:
    json.dump(posts_list, json_file, indent=4)