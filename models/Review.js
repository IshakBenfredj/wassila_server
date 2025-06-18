const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
    stars: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} ليس قيمة صحيحة'
        }
    },
    reviewText: {
        type: String,
        required: false
    },
    reviewer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewedUser: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {timestamps : true});

// Index to prevent duplicate reviews from the same user
reviewSchema.index({ reviewer: 1, reviewedUser: 1 }, { unique: true });

// Optional: Add validation to prevent users from reviewing themselves
reviewSchema.pre('validate', function(next) {
    if (this.reviewer.equals(this.reviewedUser)) {
        this.invalidate('reviewer', 'لا يمكنك تقييم نفسك');
    }
    next();
});

module.exports = mongoose.model('Review', reviewSchema);