export default function SkeletonCard() {
  return (
    <div className="skel">
      <div className="skelMedia" />
      <div className="skelBody">
        <div className="skelLine w80" />
        <div className="skelLine w60" />
        <div className="skelLine w35" />
      </div>
    </div>
  );
}