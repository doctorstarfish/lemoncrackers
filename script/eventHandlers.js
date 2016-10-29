function nextButtonHandler(event){
    window.g.page += 1;
    refresh();
}

function prevButtonHandler(event){
    if (window.g.page > 0){
        window.g.page -= 1;
    }

    refresh();
}

function shiftSelectHandler(event){
    console.log('chage');
    window.g.displayCap = parseInt(event.target.value);

    refresh();
}
