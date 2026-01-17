import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 15
    },
    first_name:{
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20,
    },
    last_name:{
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20,
    },
    email:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    phone_number: {
        type: String ,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false
    },
    // Password reset fields
    resetPasswordOtp: {
        type: String,
        select: false
    },
    resetPasswordExpiresAt: {
        type: Date,
        select: false
    }
    /*gender: {
        type: String,
        required: true,
        enum: ['male', 'female']
    },

    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }]*/
});

const User = mongoose.model('User', userSchema);

export default User;