import { formatDuration,formatViews,timeAgo } from "../../assets/utils/format"
import { Link,useNavigate} from "react-router-dom";

export default function VideoCard({video}){
  const navigate=useNavigate();
  const handleChannelClick=(e)=>{
    e.stopPropagation();
    e.preventDefault();
    navigate(`/channel/${video.channel.handle}`)
    
    // window.open(video.channel.url,'_blank');
  }
    return(
        <div className="vid">
        <Link to={`/watch/${video.videoId}`}>
        <div className="vdeo-element">
          <img
            className="thumbnail"
            src={`http://localhost:5001${video.thumbnail.url}`}
            alt={video.title}
          />
          <div className="vid-time">
            {formatDuration(video.duration)}
          </div>
        </div>
        
  
        <div className="info">
          <div className="av">
            <img
              className="avtar"
              src={`http://localhost:5001${video.channel.avatar}`}
              alt={video.channel.name}
            />
          </div>
  
          <div className="vid-info">
            <p className="vid-title">{video.title}</p>
  
            <div className="stat">
              <div className="chnl-name">
                <div onClick={handleChannelClick}
                  className="chnl"
                >
                  {video.channel.name}
                </div>
  
                <p className="time-stat">
                  {formatViews(video.views)} views ·{" "}
                  {timeAgo(video.publishedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
        </Link>
      </div>
    );
  }