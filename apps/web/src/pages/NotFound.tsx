import { Link } from 'react-router-dom';
import { StateMessage } from '../components/ui';

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <StateMessage kind="empty" title="Page not found">
        <Link to="/" className="text-leaf-700 underline">Return to the home page</Link>
      </StateMessage>
    </div>
  );
}
