fetch('posts.json')
  .then(response => response.json())
  .then(posts => {
    const postsList = document.createElement('ul');
    postsList.classList.add('posts');

    posts.forEach(post => {
      const listItem = document.createElement('li');
      
      // Ensure date is in the correct format
      const postDate = new Date(post.date + 'T00:00:00'); // Add time part to avoid timezone issues
      const formattedDate = postDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      // Check for "Invalid Date" and handle it
      const dateDisplay = formattedDate === 'Invalid Date' ? 'Unknown Date' : formattedDate;

      listItem.innerHTML = `
        <span class="post-date">${dateDisplay}</span>
        <a class="post-link" href="${post.url}">${post.title}</a>
      `;

      postsList.appendChild(listItem);
    });

    document.getElementById('posts').appendChild(postsList);
  })
  .catch(error => {
    console.error('Error loading post list:', error);
  });