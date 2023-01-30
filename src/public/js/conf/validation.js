$(function () {
    /*$.validator.setDefaults({
        submitHandler: function () {
            alert("¡Formulario enviado con éxito!");
        }
    });*/
    $('#quickForm').validate({
        rules: {
            identification: {
                required: true,
                number: true,
                minlength: 10
            },
            name: {
                required: true
            },
            names: {
                required: true
            },
            lastnames: {
                required: true
            },
            logo: {
                required: true
            },
            address: {
                required: true,
                minlength: 5
            },
            email: {
                required: true,
                email: true,
            },
            emailCustomer: {
                email: true,
            },
            contact: {
                required: true,
                number: true,
                minlength: 10
            },
            username: {
                required: true,
                minlength: 5
            },
            password: {
                required: true,
                minlength: 5
            },
            newPassword: {
                required: true,
                minlength: 5
            },
            confirmPassword: {
                required: true,
                minlength: 5
            },

            brand: {
                required: true
            },
            model: {
                required: true
            },
            colorPrimary: {
                required: true
            },
            statusDevice: {
                required: true
            },
            reason: {
                required: true
            },
            reasonCost: {
                required: true
            },
        },
        messages: {
            identification: {
                required: "Este campo es requerido",
                number: "Por favor, ingrese una identificación valida",
                minlength: "La identificación debe tener al menos 10 caracteres"
            },
            name: {
                required: "Este campo es requerido"
            },
            names: {
                required: "Este campo es requerido"
            },
            lastnames: {
                required: "Este campo es requerido"
            },
            logo: {
                required: "Este campo es requerido"
            },
            address: {
                required: "Este campo es requerido",
                minlength: "La dirección debe tener al menos 5 caracteres"
            },
            email: {
                required: "Por favor, introduzca una dirección de correo electrónico",
                email: "Por favor, introduce una dirección de correo electrónico válida"
            },
            emailCustomer: {
                email: "Por favor, introduce una dirección de correo electrónico válida"
            },
            contact: {
                required: "Este campo es requerido",
                number: "Por favor, ingrese un número valido",
                minlength: "El contacto debe tener al menos 10 caracteres"
            },
            username: {
                required: "Por favor, proporcione un nombre de usuario",
                minlength: "El nombre de usuario debe tener al menos 5 caracteres"
            },
            password: {
                required: "Por favor, proporcione una contraseña",
                minlength: "La contraseña debe tener al menos 5 caracteres"
            },
            newPassword: {
                required: "Por favor, proporcione la nueva contraseña",
                minlength: "La contraseña debe tener al menos 5 caracteres"
            },
            confirmPassword: {
                required: "Por favor, repita la nueva contraseña",
                minlength: "La contraseña debe tener al menos 5 caracteres"
            },

            brand: {
                required: "Este campo es requerido"
            },
            model: {
                required: "Este campo es requerido"
            },
            colorPrimary: {
                required: "Este campo es requerido"
            },
            statusDevice: {
                required: "Este campo es requerido"
            },
            reason: {
                required: "Este campo es requerido"
            },
            reasonCost: {
                required: "Este campo es requerido"
            },
        },
        errorElement: 'span',
        errorPlacement: function (error, element) {
            error.addClass('invalid-feedback');
            element.closest('.form-group').append(error);
        },
        highlight: function (element, errorClass, validClass) {
            $(element).addClass('is-invalid');
        },
        unhighlight: function (element, errorClass, validClass) {
            $(element).removeClass('is-invalid');
            //$(element).addClass('is-valid');
        }
    });
});