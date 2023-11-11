import json
import os

# Assuming this script is run from the root of your project directory
posts_directory = "./posts"
posts_list = []

for filename in os.listdir(posts_directory):
    if filename.endswith(".html"):
        post_path = os.path.join(posts_directory, filename)
        post_title = filename.replace('.html', '').replace('-', ' ').title()
        posts_list.append({"title": post_title, "url": post_path})

with open("posts.json", "w") as json_file:
    json.dump(posts_list, json_file, indent=4)