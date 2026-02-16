import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/feedback.css";
import API from "../api";

function FeedbackModal({ visible, bookingId, mechanicId, onClose }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if feedback already submitted for this booking
    const submitted = localStorage.getItem(`feedback_${bookingId}`);
    if (submitted === "true") {
      onClose();
    }
  }, [bookingId, onClose]);

  if (!visible) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setSubmitting(true);

    try {
      await API.post("booking/feedback/", {
        booking_id: bookingId,
        rating: rating,
        feedback: feedback.trim() || "",
      });

      localStorage.setItem(`feedback_${bookingId}`, "true");
      alert("Thank you for your feedback!");
      onClose();
      navigate("/user");
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`feedback_${bookingId}`, "skipped");
    onClose();
  };

  return (
    <div className="feedback-overlay" onClick={handleSkip}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-header">
          <h2>Rate Your Experience</h2>
          <p>How was your service?</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rating-container">
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${rating >= star ? "filled" : ""} ${hoveredRating >= star ? "hovered" : ""}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  ⭐
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="rating-text">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
            )}
          </div>

          <div className="feedback-input-container">
            <label htmlFor="feedback">Additional Feedback (Optional)</label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us about your experience..."
              rows="4"
              maxLength={500}
            />
            <span className="char-count">{feedback.length}/500</span>
          </div>

          <div className="feedback-actions">
            <button
              type="button"
              className="skip-btn"
              onClick={handleSkip}
              disabled={submitting}
            >
              Skip
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={rating === 0 || submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FeedbackModal;
