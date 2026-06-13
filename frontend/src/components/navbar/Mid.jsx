import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import search from './assets/search.svg';
import mic from './assets/mic.svg';

export default function Mid() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');

    const handleSearch = () => {
        const q = query.trim();
        if (!q) return;
        navigate(`/search?q=${encodeURIComponent(q)}`);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="mid">
            <div className="srch">
                <input
                    className="searchbar"
                    type="text"
                    placeholder="Search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button className="srch-btn" onClick={handleSearch}>
                    <img id="srch" src={search} alt="search" />
                </button>
            </div>
            <button className="mic">
                <img id="mic" src={mic} alt="mic" />
            </button>
        </div>
    );
}