function nextButtonHandler(event){
    window.g.page += 1;
    display(false);
}

function prevButtonHandler(event){
    if (window.g.page > 0){
        window.g.page -= 1;
    }

    display(false);
}

function shiftSelectHandler(event){
    window.g.displayCap = parseInt(event.target.value);

    display(false);
}
