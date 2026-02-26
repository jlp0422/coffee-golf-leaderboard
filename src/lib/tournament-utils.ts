import { localDateStr } from "./date-utils";

export type TournamentStatus = "Live" | "Upcoming" | "Final";

export function getTournamentStatus(
  startDate: string,
  endDate: string
): TournamentStatus {
  const today = localDateStr();
  if (today > endDate) return "Final";
  if (today >= startDate) return "Live";
  return "Upcoming";
}

export function statusBadgeClass(status: TournamentStatus): string {
  switch (status) {
    case "Live":
      return "bg-green-100 text-green-700";
    case "Upcoming":
      return "bg-blue-100 text-blue-700";
    case "Final":
      return "bg-gray-100 text-gray-600";
  }
}
