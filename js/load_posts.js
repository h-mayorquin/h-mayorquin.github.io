fetch('posts.json')
  .then(response => response.json())
  .then(posts => {
    const postsList = document.createElement('ul');
    postsList.classList.add('posts');

    posts.forEach(post => {
      const listItem = document.createElement('li');
      
      // Check if the date is valid and in the expected format
      const postDate = isNaN(Date.parse(post.date)) ? new Date() : new Date(post.date);
      const formattedDate = postDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      listItem.innerHTML = `
        <span class="post-date">${formattedDate}</span>
        <a class="post-link" href="${post.url}">${post.title}</a>
      `;

      postsList.appendChild(listItem);
    });

    document.getElementById('posts').appendChild(postsList);
  })
  .catch(error => {
    console.error('Error loading post list:', error);
    // Handle the error, perhaps by showing a user-friendly message
  });