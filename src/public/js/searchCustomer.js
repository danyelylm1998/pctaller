const socket = io();

let searchCustomer = document.getElementById('searchCustomer');
let namesCustomer = document.getElementById('namesCustomer');
let lastNamesCustomer = document.getElementById('lastNamesCustomer');
let addressCustomer = document.getElementById('addressCustomer');
let emailCustomer = document.getElementById('emailCustomer');
let contactCustomer = document.getElementById('contactCustomer');
let buttonSearch = document.getElementById('searchCustomerBtn');
let clearCustomerBtn = document.getElementById('clearCustomerBtn');

buttonSearch.addEventListener('click', function () {
    socket.emit('customerEvent', { customerClient: searchCustomer.value });
});

clearCustomerBtn.addEventListener('click', function () {
    searchCustomer.value = '';
    namesCustomer.value = '';
    lastNamesCustomer.value = '';
    addressCustomer.value = '';
    emailCustomer.value = '';
    contactCustomer.value = '';
});

socket.on('customerEventConsult', function (customerDB) {
    if (customerDB.length > 0) {
        namesCustomer.value = customerDB[0].names;
        lastNamesCustomer.value = customerDB[0].lastnames;
        addressCustomer.value = customerDB[0].address;
        emailCustomer.value = customerDB[0].email;
        contactCustomer.value = customerDB[0].contact;
    } else {
        namesCustomer.value = '';
        lastNamesCustomer.value = '';
        addressCustomer.value = '';
        emailCustomer.value = '';
        contactCustomer.value = '';
    };
});