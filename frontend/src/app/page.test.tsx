import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

// Mock the API module
vi.mock("@/lib/api", () => ({
  fetchAthletes: vi.fn().mockResolvedValue([]),
  checkDuplicate: vi
    .fn()
    .mockResolvedValue({ isDuplicate: false, level: "none" }),
  createAthlete: vi.fn(),
}));

import { createAthlete, fetchAthletes } from "@/lib/api";

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchAthletes as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("should render the form with all fields", async () => {
    render(<Home />);
    expect(screen.getByText("Quick Manual Add")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. John")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. Smith")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. Forward")).toBeDefined();
    expect(screen.getByPlaceholderText("parent@example.com")).toBeDefined();
    expect(screen.getByText("Add to Candidates")).toBeDefined();
  });

  it("should render the candidates section", async () => {
    render(<Home />);
    expect(screen.getByText("Refresh")).toBeDefined();
    expect(screen.getByText("No candidates yet. Add one above.")).toBeDefined();
  });

  it("should show success message on successful creation", async () => {
    (createAthlete as ReturnType<typeof vi.fn>).mockResolvedValue({
      athlete: {
        id: "1",
        firstName: "John",
        lastName: "Smith",
        position: "Forward",
        parentEmail: "parent@test.com",
      },
    });

    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText("e.g. John"), "John");
    await user.type(screen.getByPlaceholderText("e.g. Smith"), "Smith");
    await user.type(screen.getByPlaceholderText("e.g. Forward"), "Forward");
    await user.type(
      screen.getByPlaceholderText("parent@example.com"),
      "parent@test.com",
    );
    await user.click(screen.getByText("Add to Candidates"));

    await waitFor(() => {
      expect(screen.getByText("Added!")).toBeDefined();
    });
  });

  it("should show error message on duplicate detection", async () => {
    (createAthlete as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: "Duplicate detected",
      duplicateCheck: {
        isDuplicate: true,
        level: "exact",
        confidence: 1.0,
        details: "Exact normalized match found",
        matchedAthlete: {
          id: "1",
          firstName: "John",
          lastName: "Smith",
          parentEmail: "parent@test.com",
        },
      },
    });

    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByPlaceholderText("e.g. John"), "John");
    await user.type(screen.getByPlaceholderText("e.g. Smith"), "Smith");
    await user.type(screen.getByPlaceholderText("e.g. Forward"), "Forward");
    await user.type(
      screen.getByPlaceholderText("parent@example.com"),
      "parent@test.com",
    );
    await user.click(screen.getByText("Add to Candidates"));

    await waitFor(() => {
      expect(screen.getByText("Exact Duplicate")).toBeDefined();
    });
  });

  it("should display athletes in the table when loaded", async () => {
    (fetchAthletes as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "1",
        firstName: "John",
        lastName: "Smith",
        position: "Forward",
        parentEmail: "parent@test.com",
        normalizedFirstName: "john",
        normalizedLastName: "smith",
        normalizedParentEmail: "parent@test.com",
        metaphoneFirstName: "JN",
        metaphoneLastName: "SM0",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ]);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("John Smith")).toBeDefined();
      expect(screen.getByText("Forward")).toBeDefined();
      expect(screen.getByText("parent@test.com")).toBeDefined();
    });
  });
});
