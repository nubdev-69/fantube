import more from '../video/assets/more.png'
import './shorts.css'
import { formatViews } from '../../assets/utils/format';

export default function Shorts() {
    // Sample data - replace with actual data from props or API
    const shortsData = Array(10).fill({
        thumbnail: img,
        title: "Kuma makes the ultimate sacrifice for strawhats",
        views: 23455
    });

    return (
        <div className="channel-shorts">
            {shortsData.map((short, index) => (
                <div className="shorts-container" key={index}>
                    <div className="shorts-thumbnail-container">
                        <img src={short.thumbnail} alt={short.title} className="shorts-thumbnail" />
                    </div>
                    <div className="shorts-info">
                        <div className="shorts-meta">
                            <span className="shorts-title">{short.title}</span>
                            <span className="shorts-views-count">{formatViews(short.views)} views</span>
                        </div>
                        <div className="more-img-container">
                            <img src={more} alt="more" className="more-button" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}