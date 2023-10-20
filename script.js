document.getElementById('button').addEventListener('click', () => {
    const color = document.getElementById('color').value;
    const result = document.getElementById('result');

    if (color === '') {
        result.innerHTML = 'Please enter a color.';
    } else {
        const count = countOccurrences(color);
        result.innerHTML = `The count of "${color}" in the given text is ${count}.`;
    }
});

function countOccurrences(searchString) {
    let count = 0;
    const str = document.getElementById('text').value;
    const regex = new RegExp(searchString, 'gi');
    const matches = str.match(regex);

    if (matches) {
        count = matches.length;
    }

    return count;
}
