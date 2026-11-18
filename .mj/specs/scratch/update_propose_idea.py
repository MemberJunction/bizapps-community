import sys

path = '/Users/amith/Dropbox/develop/M5-sf-community-clean/bizapps-community/packages/Angular/src/lib/community-hub-resource.component.ts'
with open(path, 'r') as f:
    content = f.read()

old_block = """  public async ProposeIdea(): Promise<void> {
    const title = this.newIdeaTitle.trim();
    if (!title) return;
    const summary = this.newIdeaSummary.trim() || 'Community member proposal.';
    const generatedId = crypto.randomUUID();
    const created: CommunityHubIdeaItem = {
      id: generatedId,
      campaignId: this.activeCampaign.id,
      title,
      summary,
      totalPointsAllocated: 0,
      effectiveQuadraticVotes: 0,
      myPointsAllocated: 0,
      myEffectiveVotes: 0,
    };

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (provider && user) {
      if (!this.hasActiveCampaign) {
        this.ideationErrorMessage = 'No ideation campaign is configured for this community space — cannot propose idea.';
        this.cdr.markForCheck();
        return;
      }
      try {
        await this.ensurePostTypesLoaded(user);
        const postTypeId = this.resolvePostTypeId(IDEA_POST_TYPE_CODE);
        const persisted = await PersistProposedIdea({
          forumId: this.activeCampaign.id,
          postTypeId,
          title,
          summary,
          user,
        });
        if (!persisted.success || !persisted.postId) {
          this.ideationErrorMessage = persisted.errorMessage ?? 'Failed to save proposed idea.';
          this.cdr.markForCheck();
          return;
        }
        created.id = persisted.postId;
      } catch (err) {
        this.ideationErrorMessage = err instanceof Error ? err.message : 'Server error while proposing idea.';
        this.cdr.markForCheck();
        return;
      }
    }

    this.ideationItems = [created, ...this.ideationItems];
    this.rebuildCommonsItems();
    this.selectedIdeaId = created.id;
    this.focusedIdeaId = created.id;
    this.newIdeaTitle = '';
    this.newIdeaSummary = '';
    this.showIdeaComposer = false;
    this.ideationErrorMessage = null;
    this.cdr.markForCheck();
  }"""

new_block = """  public async ProposeIdea(): Promise<boolean> {
    const title = this.newIdeaTitle.trim();
    if (!title) return false;
    const summary = this.newIdeaSummary.trim() || 'Community member proposal.';
    const generatedId = crypto.randomUUID();
    const created: CommunityHubIdeaItem = {
      id: generatedId,
      campaignId: this.activeCampaign.id,
      title,
      summary,
      totalPointsAllocated: 0,
      effectiveQuadraticVotes: 0,
      myPointsAllocated: 0,
      myEffectiveVotes: 0,
    };

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;

    if (provider) {
      if (!user?.ID) {
        this.persistenceErrorMessage = 'Unable to propose idea: no authenticated user in active session.';
        this.cdr.markForCheck();
        return false;
      }
      
      if (!this.hasActiveCampaign) {
        this.ideationErrorMessage = 'No ideation campaign is configured for this community space — cannot propose idea.';
        this.cdr.markForCheck();
        return false;
      }
      try {
        await this.ensurePostTypesLoaded(user);
        const postTypeId = this.resolvePostTypeId(IDEA_POST_TYPE_CODE);
        const persisted = await PersistProposedIdea({
          forumId: this.activeCampaign.id,
          postTypeId,
          title,
          summary,
          user,
        });
        if (!persisted.success || !persisted.postId) {
          this.ideationErrorMessage = persisted.errorMessage ?? 'Failed to save proposed idea.';
          this.cdr.markForCheck();
          return false;
        }
        created.id = persisted.postId;
      } catch (err) {
        this.ideationErrorMessage = err instanceof Error ? err.message : 'Server error while proposing idea.';
        this.cdr.markForCheck();
        return false;
      }
    }

    this.ideationItems = [created, ...this.ideationItems];
    this.rebuildCommonsItems();
    this.selectedIdeaId = created.id;
    this.focusedIdeaId = created.id;
    this.newIdeaTitle = '';
    this.newIdeaSummary = '';
    this.showIdeaComposer = false;
    this.ideationErrorMessage = null;
    this.cdr.markForCheck();
    return true;
  }"""

if old_block in content:
    new_content = content.replace(old_block, new_block)
    with open(path, 'w') as f:
        f.write(new_content)
    print("Success")
else:
    print("Not found")
